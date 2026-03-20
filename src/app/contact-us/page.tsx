'use client';

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Contact Us</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-700 mb-6">
              Have questions? We'd love to hear from you. Send us a message and we'll respond 
              as soon as possible.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Support */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Support</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-medium text-gray-700">Email:</dt>
                    <dd>
                      <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline">
                        mysocietydetails7@gmail.com
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Hours:</dt>
                    <dd className="text-gray-600">Monday - Friday: 9 AM - 6 PM IST</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Response Time:</dt>
                    <dd className="text-gray-600">Within 24 hours</dd>
                  </div>
                </dl>
              </div>

              {/* Billing */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing & Refunds</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-medium text-gray-700">Email:</dt>
                    <dd>
                      <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline">
                        mysocietydetails7@gmail.com
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Payment Issues:</dt>
                    <dd>
                      <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline">
                        mysocietydetails7@gmail.com
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Hours:</dt>
                    <dd className="text-gray-600">Monday - Friday: 10 AM - 5 PM IST</dd>
                  </div>
                </dl>
              </div>

              {/* Technical Issues */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgent Support</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-medium text-gray-700">Bhavana Shekhawat</dt>
                    <dd>
                      <a href="tel:+918454030860" className="text-blue-600 hover:underline">
                        +91 84540 30860
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Nitu Nathawat</dt>
                    <dd>
                      <a href="tel:+917506166244" className="text-blue-600 hover:underline">
                        +91 75061 66244
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Available:</dt>
                    <dd className="text-gray-600">For emergencies & urgent issues</dd>
                  </div>
                </dl>
              </div>

              {/* Legal */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal & Privacy</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-medium text-gray-700">Email:</dt>
                    <dd>
                      <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline">
                        mysocietydetails7@gmail.com
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Privacy:</dt>
                    <dd>
                      <a href="mailto:mysocietydetails7@gmail.com" className="text-blue-600 hover:underline">
                        mysocietydetails7@gmail.com
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Response Time:</dt>
                    <dd className="text-gray-600">Within 48 hours</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Persons</h3>
            <div className="space-y-2">
              <p className="text-gray-700"><strong>Bhavana Shekhawat</strong> - +91 84540 30860</p>
              <p className="text-gray-700"><strong>Nitu Nathawat</strong> - +91 75061 66244</p>
            </div>
            <p className="text-gray-700 mt-4">
              For quickest response, email us first. Phone support is available for emergencies. Most issues resolved within 24 hours.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <details className="bg-gray-50 p-4 rounded">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  How long does it take to receive support?
                </summary>
                <p className="text-gray-700 mt-3">
                  Most inquiries are responded to within 24 hours during business hours. 
                  Urgent technical issues may be prioritized.
                </p>
              </details>

              <details className="bg-gray-50 p-4 rounded">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  Is support available on weekends?
                </summary>
                <p className="text-gray-700 mt-3">
                  No, standard support is available Monday-Friday. However, urgent technical issues 
                  may be escalated for emergency support on weekends.
                </p>
              </details>

              <details className="bg-gray-50 p-4 rounded">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  How do I request a refund?
                </summary>
                <p className="text-gray-700 mt-3">
                  Please email refunds@mysocietydetails.com with your transaction ID and reason for the refund. 
                  See our Cancellation and Refunds Policy for more details on eligibility.
                </p>
              </details>

              <details className="bg-gray-50 p-4 rounded">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  Can I call instead of email?
                </summary>
                <p className="text-gray-700 mt-3">
                  Email is preferred as it creates a documented record and helps us serve you better. 
                  Phone support can be arranged for critical issues - mention in your email.
                </p>
              </details>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Support Channels</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Email (Primary)</li>
              <li>✓ In-app support (Coming soon)</li>
              <li>✓ Help center (Coming soon)</li>
              <li>✓ Community forum (Coming soon)</li>
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