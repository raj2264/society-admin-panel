'use client';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              MySocietyDetails ("we" or "us" or "our") operates the website and mobile application. 
              This page informs you of our policies regarding the collection, use, and disclosure of 
              personal data when you use our service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information Collection and Use</h2>
            <p>We collect several different types of information for various purposes:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Personal Data:</strong> Name, email address, phone number, address</li>
              <li><strong>Payment Information:</strong> Processed through Razorpay (we don't store card details)</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, features used</li>
              <li><strong>Device Information:</strong> Device type, IP address, browser type</li>
              <li><strong>Location Data:</strong> If permitted, your approximate location (not precise)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Use of Data</h2>
            <p>MySocietyDetails uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To provide customer care and support</li>
              <li>To analyze usage patterns and improve our service</li>
              <li>To monitor the security and detect fraud</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Security of Data</h2>
            <p>
              The security of your data is important to us, but remember that no method of transmission 
              over the Internet or method of electronic storage is 100% secure. While we strive to use 
              commercially acceptable means to protect your Personal Data, we cannot guarantee its 
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>
              We will retain your Personal Data only for as long as necessary for the purposes set out in 
              this Privacy Policy. We will retain and use your Personal Data to the extent necessary to 
              comply with our legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Access the Personal Data we keep about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request restriction of processing</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Third-Party Services</h2>
            <p>
              We use third-party services like Supabase and Razorpay. These services may collect and 
              process your personal data according to their own privacy policies. We recommend reviewing 
              their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>
              We use cookies to enhance your experience. You can choose to disable cookies through your 
              browser settings, but this may limit your ability to use certain features of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date at the 
              bottom of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at
              <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline ml-1">
                mysocietydetails7@gmail.com
              </a>
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8 pt-6 border-t">
            Last updated: March 20, 2026
          </p>
        </div>
      </div>
    </div>
  );
}