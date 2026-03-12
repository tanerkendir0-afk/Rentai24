import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import SectionCTA from "@/components/section-cta";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Privacy() {
  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-privacy-title">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg">
              Last updated: January 1, 2025
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card className="p-8 sm:p-10 bg-card border-border/50 prose prose-invert max-w-none">
              <div className="space-y-8 text-muted-foreground leading-relaxed">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
                  <p>
                    RentAI 24 ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our AI staffing services.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
                  <p className="mb-3">We collect information that you voluntarily provide to us when you:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Register for an account (name, email, company, username)</li>
                    <li>Subscribe to a plan (payment information processed by Stripe)</li>
                    <li>Use our AI agents (conversation data)</li>
                    <li>Contact us through our contact form</li>
                    <li>Subscribe to our newsletter</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>To provide and maintain our AI staffing services</li>
                    <li>To process your transactions securely via Stripe</li>
                    <li>To send you service-related communications</li>
                    <li>To improve our AI agents and platform</li>
                    <li>To respond to your inquiries and support requests</li>
                    <li>To send newsletter updates (only if you opted in)</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Security</h2>
                  <p>
                    We implement industry-standard security measures to protect your personal information. All data is encrypted in transit using TLS/SSL. Payment processing is handled entirely by Stripe and we never store your credit card details on our servers. Passwords are hashed using bcrypt with a cost factor of 12.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">5. AI Conversation Data</h2>
                  <p>
                    Conversations with our AI agents are processed through OpenAI's API. We do not permanently store your conversation history on our servers. Conversation data is used solely to provide real-time responses and is not used to train our base models. If you upload documents for RAG (Retrieval-Augmented Generation), those documents are stored securely and used only to enhance your specific agent's responses.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">6. Third-Party Services</h2>
                  <p className="mb-3">We use the following third-party services:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Stripe</strong> — Payment processing and subscription management</li>
                    <li><strong>OpenAI</strong> — AI agent conversation processing</li>
                  </ul>
                  <p className="mt-3">Each third-party service has its own privacy policy governing the use of your information.</p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies</h2>
                  <p>
                    We use essential session cookies to maintain your login state. We do not use advertising or tracking cookies. Our service worker may cache static assets locally for improved performance (PWA functionality).
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights (GDPR)</h2>
                  <p className="mb-3">If you are located in the European Economic Area, you have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Access, correct, or delete your personal data</li>
                    <li>Restrict or object to our processing of your data</li>
                    <li>Data portability</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                  <p className="mt-3">To exercise these rights, contact us at hello@rentai24.com.</p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">9. Data Retention</h2>
                  <p>
                    We retain your account information for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law. Contact form messages and newsletter subscriptions are retained until you request deletion.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
                  <p>
                    If you have any questions about this Privacy Policy, please contact us at{" "}
                    <a href="mailto:hello@rentai24.com" className="text-blue-400 hover:underline">hello@rentai24.com</a>.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
