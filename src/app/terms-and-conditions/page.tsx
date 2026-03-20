'use client';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to MySocietyDetails. These Terms and Conditions govern your use of our platform, 
              including the web application and mobile application. By accessing and using our service, 
              you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. User Accounts</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account information</li>
              <li>You agree to accept responsibility for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You agree not to share your login credentials with anyone</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Payment Terms</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>All payments are processed through Razorpay</li>
              <li>You agree to pay all charges incurred with your account</li>
              <li>Billing occurs on the date specified in your subscription or service agreement</li>
              <li>Prices are subject to change with 30 days notice</li>
              <li>All payments are non-refundable except as expressly stated in our Refund Policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Use the service for any illegal purpose or in violation of any laws</li>
              <li>Harass, abuse, or harm anyone or any property</li>
              <li>Attempt to gain unauthorized access to restricted areas</li>
              <li>Transmit spam, viruses, or any other malicious code</li>
              <li>Interfere with the operation of the service</li>
              <li>Infringe upon intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Intellectual Property Rights</h2>
            <p>
              All content, features, and functionality of the service are owned by MySocietyDetails, 
              its licensors, or other providers of such material and are protected by international 
              copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Disclaimer of Warranties</h2>
            <p>
              The service is provided on an "AS IS" and "AS AVAILABLE" basis. MySocietyDetails makes no 
              warranties, expressed or implied, regarding the service. We disclaim all warranties including 
              implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>
              MySocietyDetails shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of or inability to use the service, even if we 
              have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Termination</h2>
            <p>
              We may terminate your account and access to the service at any time, for any reason, 
              with or without cause. You may terminate your account by contacting us at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Governing Law</h2>
            <p>
              These Terms and Conditions are governed by and construed in accordance with the laws of India, 
              and you irrevocably submit to the exclusive jurisdiction of the courts in India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Your continued use of the service 
              following the posting of revised Terms means that you accept and agree to the changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p>
              If you have questions about these Terms and Conditions, please contact us at 
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