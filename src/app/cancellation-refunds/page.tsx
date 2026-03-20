'use client';

export default function CancellationAndRefunds() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cancellation and Refunds Policy</h1>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Cancellation Policy</h2>
            <p>
              You can cancel your subscription or membership at any time. Cancellation can be done 
              through your account settings or by contacting our support team.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Cancellation takes effect at the end of the current billing cycle</li>
              <li>You will retain access to paid features until the end of your billing period</li>
              <li>Immediate termination is available upon request, but no refund will be issued</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Refund Eligibility</h2>
            <p>Refunds are provided in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Within 7 Days:</strong> Full refund if request is made within 7 days of payment</li>
              <li><strong>Duplicate Charges:</strong> Full refund for accidental duplicate charges</li>
              <li><strong>Service Failure:</strong> Partial refund if service is unavailable for extended periods</li>
              <li><strong>Technical Issues:</strong> Full refund if we cannot deliver the promised service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Non-Refundable Circumstances</h2>
            <p>The following are NOT eligible for refunds:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Purchases older than 7 days</li>
              <li>Refunds requested after subscription has been actively used</li>
              <li>Purchases made in error (user's responsibility to verify)</li>
              <li>Refunds for services accessed and used</li>
              <li>Cancellation requests without proper documentation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Refund Process</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Contact our support team with your refund request</li>
              <li>Provide transaction ID and reason for refund</li>
              <li>We will review and respond within 5-7 business days</li>
              <li>If approved, refund will be processed within 7-10 business days</li>
              <li>Refund will be credited to the original payment method</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Partial Refunds</h2>
            <p>
              In cases where partial refunds are applicable, they will be calculated based on the 
              remaining days of service at the time of cancellation. Pro-rata refunds will be applied 
              to your account as credit only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Failed or Declined Payments</h2>
            <p>
              If a payment fails or is declined, we will make up to 3 attempts to process the payment. 
              After 3 failed attempts, your account may be suspended. You can retry payment or switch 
              to a different payment method.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Refund for Service Interruption</h2>
            <p>
              If our service is unavailable for more than 24 consecutive hours due to our fault, you are 
              entitled to a prorated refund for the period of unavailability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Currency and Exchange Rates</h2>
            <p>
              Refunds will be issued in the same currency as the original purchase. Exchange rate 
              fluctuations are not our responsibility, and refunds will be processed at the rate 
              current at the time of refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Dispute Resolution</h2>
            <p>
              If you dispute a charge, we will investigate the claim. If a chargeback is filed with 
              your bank or payment provider without contacting us first, we may suspend your account 
              pending resolution.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p>
              For refund requests or questions about this policy, please contact us at:
            </p>
            <ul className="list-none space-y-1 mt-3">
              <li>
                Email: <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline">
                  mysocietydetails7@gmail.com
                </a>
              </li>
              <li>Phone: Available during business hours</li>
            </ul>
          </section>

          <p className="text-sm text-gray-500 mt-8 pt-6 border-t">
            Last updated: March 20, 2026
          </p>
        </div>
      </div>
    </div>
  );
}