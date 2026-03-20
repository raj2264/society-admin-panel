'use client';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping Policy</h1>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Scope</h2>
            <p>
              This Shipping Policy applies to physical goods delivered through MySocietyDetails, 
              including resident documents, printed materials, or merchandise ordered through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Shipping Methods</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Standard Delivery:</strong> 5-7 business days (Included)</li>
              <li><strong>Express Delivery:</strong> 2-3 business days (Additional charge applies)</li>
              <li><strong>Same Day Delivery:</strong> Available in select areas (Additional charge applies)</li>
              <li><strong>In-Society Pickup:</strong> Free at reception (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Processing Time</h2>
            <p>
              Orders are processed within 1-2 business days. Processing time does not include 
              shipping time. We do not process orders on weekends and public holidays.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Shipping Costs</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Orders within Mumbai: Free delivery for orders above ₹500</li>
              <li>Orders across India: Calculated based on weight and distance</li>
              <li>International: Available on request</li>
              <li>Bulk deliveries: Special rates available - contact us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Delivery Address</h2>
            <p>
              Ensure your delivery address is complete and accurate. We deliver to:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Your registered society address</li>
              <li>Alternate addresses within the city (with approval)</li>
              <li>Society reception/office during business hours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Tracking</h2>
            <p>
              Every shipment comes with a tracking number. You can track your order through:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Your account dashboard</li>
              <li>Email notifications (automatic)</li>
              <li>SMS updates (optional)</li>
              <li>Third-party courier tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Delivery Delays</h2>
            <p>
              We make every effort to deliver on time. However, delays may occur due to:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Weather conditions</li>
              <li>Courier delays</li>
              <li>Address-related issues</li>
              <li>Force majeure events</li>
            </ul>
            <p className="mt-3">
              In case of delays exceeding 5 business days, contact us for compensation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Damaged or Lost Items</h2>
            <p>
              If your item arrives damaged or is lost in transit:
            </p>
            <ol className="list-decimal list-inside space-y-2 mt-3">
              <li>Report within 24 hours of receipt</li>
              <li>Provide photos of damaged packaging/item</li>
              <li>File a claim with our support team</li>
              <li>We will replace or refund the item</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Signature Requirements</h2>
            <p>
              High-value items may require signature on delivery. The recipient must be available 
              to sign. If you're unavailable, please provide written authorization for an alternate 
              recipient to sign.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Return Shipping</h2>
            <p>
              If you need to return an item:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Contact us for return authorization</li>
              <li>Return shipping may be free or paid (depending on reason)</li>
              <li>We provide return label/courier pickup</li>
              <li>Refund issued after inspection (7-10 days)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Special Requests</h2>
            <p>We accommodate special shipping requests:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Specific time window delivery</li>
              <li>Weekend/holiday delivery (premium charge)</li>
              <li>White glove service (where available)</li>
              <li>Scheduled recurring deliveries</li>
            </ul>
            <p className="mt-3">Contact billing@mysocietydetails.com for special requests.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
            <p>
              For shipping questions, contact:
            </p>
            <ul className="list-none space-y-1 mt-3">
              <li>
                Email: <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline">
                  mysocietydetails7@gmail.com
                </a>
              </li>
              <li>Hours: Monday - Friday, 9 AM - 6 PM IST</li>
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