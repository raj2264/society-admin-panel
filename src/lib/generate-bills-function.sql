-- Function to generate maintenance bills for all residents in a society
CREATE OR REPLACE FUNCTION generate_maintenance_bills(
  p_generation_log_id UUID,
  p_template_id UUID,
  p_bill_date DATE,
  p_due_date DATE,
  p_components JSONB,
  p_late_fee_percentage DECIMAL,
  p_send_immediately BOOLEAN
) RETURNS JSONB AS $$
DECLARE
  v_society_id UUID;
  v_template RECORD;
  v_resident RECORD;
  v_bill_number TEXT;
  v_total_amount DECIMAL;
  v_bill_id UUID;
  v_component JSONB;
  v_component_name TEXT;
  v_component_amount DECIMAL;
  v_bill_components JSONB := '{}'::JSONB;
  v_total_residents INTEGER := 0;
  v_successful_bills INTEGER := 0;
  v_failed_bills INTEGER := 0;
  v_error_logs JSONB[] := ARRAY[]::JSONB[];
  v_components JSONB;
  v_debug_info TEXT;
  v_error_message TEXT;
  v_stack TEXT;
BEGIN
  -- Debug log the input
  RAISE NOTICE 'Input p_components: %', p_components;
  
  -- Parse components if it's a string and ensure it's an array
  IF jsonb_typeof(p_components) = 'string' THEN
    BEGIN
      v_components := p_components::jsonb;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                            v_stack = PG_EXCEPTION_CONTEXT;
      RAISE EXCEPTION 'Failed to parse components string as JSON: % (Stack: %)', p_components, v_stack;
    END;
  ELSE
    v_components := p_components;
  END IF;

  -- Ensure v_components is an array
  IF jsonb_typeof(v_components) != 'array' THEN
    RAISE EXCEPTION 'Components must be a JSON array, got %: %', jsonb_typeof(v_components), v_components;
  END IF;

  -- Debug log the parsed components
  RAISE NOTICE 'Parsed components: %', v_components;

  -- Get society_id from template
  SELECT society_id INTO v_society_id
  FROM bill_templates bt
  WHERE bt.id = p_template_id;

  IF v_society_id IS NULL THEN
    RAISE EXCEPTION 'Template not found with ID: %', p_template_id;
  END IF;

  -- Get template details
  SELECT * INTO v_template
  FROM bill_templates bt
  WHERE bt.id = p_template_id;

  -- Count total residents
  SELECT COUNT(*) INTO v_total_residents
  FROM residents r
  WHERE r.society_id = v_society_id
  AND r.status = 'active';

  -- Update generation log with total residents
  UPDATE bill_generation_logs bgl
  SET total_bills = v_total_residents
  WHERE bgl.id = p_generation_log_id;

  -- Generate bills for each resident
  FOR v_resident IN
    SELECT r.* 
    FROM residents r
    WHERE r.society_id = v_society_id
    AND r.status = 'active'
  LOOP
    BEGIN
      -- Set debug info for this iteration
      v_debug_info := format('Processing resident: ID=%s, Name=%s, Unit=%s', 
        v_resident.id, v_resident.name, v_resident.unit_number);
      RAISE NOTICE '%', v_debug_info;

      -- Generate bill number
      BEGIN
        v_bill_number := generate_bill_number(v_society_id, p_bill_date);
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                              v_stack = PG_EXCEPTION_CONTEXT;
        RAISE EXCEPTION 'Failed to generate bill number: % (Stack: %)', v_error_message, v_stack;
      END;
      
      -- Reset bill components and total amount for each resident
      v_bill_components := '{}'::JSONB;
      v_total_amount := 0;
      
      -- Calculate component amounts
      FOR v_component IN SELECT * FROM jsonb_array_elements(v_components)
      LOOP
        BEGIN
          -- Debug log each component
          v_debug_info := format('Processing component: %s', v_component::text);
          RAISE NOTICE '%', v_debug_info;
          
          -- Get component details
          SELECT name INTO v_component_name
          FROM bill_components bc
          WHERE bc.id = (v_component->>'id')::UUID;
          
          IF v_component_name IS NULL THEN
            RAISE EXCEPTION 'Component not found with ID: %', v_component->>'id';
          END IF;
          
          -- Get the amount from the component, defaulting to the component's default_amount if not provided
          IF v_component->>'amount' IS NOT NULL THEN
            v_component_amount := (v_component->>'amount')::DECIMAL;
          ELSE
            -- Get default amount from bill_components table
            SELECT default_amount INTO v_component_amount
            FROM bill_components
            WHERE id = (v_component->>'id')::UUID;
            
            IF v_component_amount IS NULL THEN
              RAISE EXCEPTION 'No amount provided and no default amount set for component %', v_component_name;
            END IF;
          END IF;

          IF v_component_amount <= 0 THEN
            RAISE EXCEPTION 'Amount must be greater than 0 for component %', v_component_name;
          END IF;

          -- Add to bill components
          v_bill_components := v_bill_components || jsonb_build_object(
            v_component->>'id',
            jsonb_build_object(
              'name', v_component_name,
              'amount', v_component_amount
            )
          );
          
          -- Add to total amount
          v_total_amount := v_total_amount + v_component_amount;
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                                v_stack = PG_EXCEPTION_CONTEXT;
          RAISE EXCEPTION 'Error processing component %: % (Stack: %)', 
            v_component_name, v_error_message, v_stack;
        END;
      END LOOP;

      -- Create the bill
      BEGIN
        WITH inserted_bill AS (
          INSERT INTO maintenance_bills (
            society_id,
            resident_id,
            template_id,
            bill_number,
            bill_date,
            due_date,
            total_amount,
            bill_components,
            late_fee_percentage,
            month_year,
            issue_date
          ) VALUES (
            v_society_id,
            v_resident.id,
            p_template_id,
            v_bill_number,
            p_bill_date,
            p_due_date,
            v_total_amount,
            v_bill_components,
            p_late_fee_percentage,
            DATE_TRUNC('month', p_bill_date)::DATE,
            p_bill_date  -- Set issue_date to bill_date
          ) RETURNING id
        )
        SELECT id INTO v_bill_id FROM inserted_bill;
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                              v_stack = PG_EXCEPTION_CONTEXT;
        RAISE EXCEPTION 'Failed to insert bill: % (Stack: %)', v_error_message, v_stack;
      END;

      -- Generate PDF
      BEGIN
        PERFORM generate_bill_pdf(v_bill_id);
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                              v_stack = PG_EXCEPTION_CONTEXT;
        RAISE EXCEPTION 'Failed to generate PDF: % (Stack: %)', v_error_message, v_stack;
      END;

      -- Send bill if requested
      IF p_send_immediately THEN
        BEGIN
          PERFORM send_bill_to_resident(v_bill_id);
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                                v_stack = PG_EXCEPTION_CONTEXT;
          RAISE EXCEPTION 'Failed to send bill: % (Stack: %)', v_error_message, v_stack;
        END;
      END IF;

      v_successful_bills := v_successful_bills + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Get the error message and stack trace
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                            v_stack = PG_EXCEPTION_CONTEXT;
      
      -- Log error and continue with next resident
      v_error_logs := array_append(v_error_logs, jsonb_build_object(
        'resident_id', v_resident.id,
        'error', v_error_message || ' | Stack: ' || v_stack || ' | Debug: ' || v_debug_info
      ));
      v_failed_bills := v_failed_bills + 1;
      
      -- Log the error for debugging
      RAISE NOTICE 'Error processing resident %: % (Stack: %)', v_resident.id, v_error_message, v_stack;
    END;
  END LOOP;

  -- Update generation log with results
  UPDATE bill_generation_logs bgl
  SET
    successful_bills = v_successful_bills,
    failed_bills = v_failed_bills,
    error_logs = v_error_logs,
    status = 'completed'
  WHERE bgl.id = p_generation_log_id;

  -- Return summary
  RETURN jsonb_build_object(
    'total_residents', v_total_residents,
    'successful_bills', v_successful_bills,
    'failed_bills', v_failed_bills,
    'error_logs', v_error_logs
  );
EXCEPTION WHEN OTHERS THEN
  -- Get the error message and stack trace
  GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                        v_stack = PG_EXCEPTION_CONTEXT;
  
  -- Update generation log with error
  UPDATE bill_generation_logs bgl
  SET
    status = 'failed',
    error_logs = array_append(ARRAY[]::JSONB[], jsonb_build_object(
      'error', v_error_message || ' | Stack: ' || v_stack || ' | Debug: ' || v_debug_info
    ))
  WHERE bgl.id = p_generation_log_id;
  
  -- Re-raise the error
  RAISE EXCEPTION '%', v_error_message;
END;
$$ LANGUAGE plpgsql;

-- Function to generate PDF for a bill
CREATE OR REPLACE FUNCTION generate_bill_pdf(p_bill_id UUID) RETURNS void AS $$
BEGIN
  -- This is a placeholder for the actual PDF generation logic
  -- In a real implementation, this would:
  -- 1. Fetch all bill details including template and components
  -- 2. Use a PDF generation library (e.g., pg_pdf) to create the PDF
  -- 3. Upload the PDF to storage (e.g., Supabase Storage)
  -- 4. Update the bill record with the PDF URL
  
  -- For now, we'll just update with a dummy URL
  UPDATE maintenance_bills
  SET pdf_url = 'https://storage.example.com/bills/' || p_bill_id || '.pdf'
  WHERE id = p_bill_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send bill to resident
CREATE OR REPLACE FUNCTION send_bill_to_resident(p_bill_id UUID) RETURNS void AS $$
BEGIN
  -- This is a placeholder for the actual email sending logic
  -- In a real implementation, this would:
  -- 1. Fetch resident's email and bill details
  -- 2. Use an email service to send the bill
  -- 3. Update the bill record with sent timestamp
  
  UPDATE maintenance_bills
  SET sent_at = NOW()
  WHERE id = p_bill_id;
END;
$$ LANGUAGE plpgsql; 