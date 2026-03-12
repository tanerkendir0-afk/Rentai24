import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Scale } from "lucide-react";
import SectionCTA from "@/components/section-cta";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Terms() {
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
              <Scale className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-terms-title">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-lg">
              Last updated: January 1, 2025
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card className="p-8 sm:p-10 bg-card border-border/50 prose prose-invert max-w-none">
              <div className="space-y-8 text-muted-foreground leading-relaxed">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">1. Agreement to Terms</h2>
                  <p>
                    By accessing or using RentAI 24's website and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access the service. These terms apply to all visitors, users, and subscribers of the platform.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
                  <p>
                    RentAI 24 provides an AI staffing platform where businesses can rent pre-trained AI agents for specific roles including customer support, sales, social media management, bookkeeping, scheduling, HR & recruiting, data analysis, and e-commerce operations. Our AI agents are powered by large language models and are designed to assist with, not replace, human decision-making.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>You must provide accurate and complete registration information</li>
                    <li>You are responsible for maintaining the security of your account credentials</li>
                    <li>You must be at least 18 years old to create an account</li>
                    <li>One person or legal entity may not maintain more than one account</li>
                    <li>You are responsible for all activities that occur under your account</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscriptions & Billing</h2>
                  <p className="mb-3">
                    Paid features are billed on a recurring monthly basis through Stripe. By subscribing to a plan:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>You authorize us to charge your payment method on a recurring basis</li>
                    <li>Subscription fees are non-refundable except as required by law</li>
                    <li>You may cancel your subscription at any time through the billing portal</li>
                    <li>Upon cancellation, you retain access until the end of your current billing period</li>
                    <li>We reserve the right to modify pricing with 30 days' notice</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">5. Acceptable Use</h2>
                  <p className="mb-3">You agree not to use RentAI 24's services to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Generate harmful, abusive, or illegal content</li>
                    <li>Impersonate individuals or organizations</li>
                    <li>Attempt to bypass usage limits or security measures</li>
                    <li>Use AI agents for automated decision-making in high-stakes domains (medical, legal, financial) without human oversight</li>
                    <li>Resell or redistribute access to AI agents without authorization</li>
                    <li>Upload malicious files or content to the platform</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">6. AI Agent Limitations</h2>
                  <p>
                    Our AI agents provide assistance and guidance based on their training. They are not certified professionals and their outputs should not be considered as professional advice (legal, financial, medical, etc.). Users are responsible for verifying AI-generated content before acting on it. We do not guarantee the accuracy, completeness, or reliability of AI agent responses.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
                  <p>
                    The RentAI 24 platform, including its design, features, and content, is owned by RentAI 24 and protected by intellectual property laws. Content generated by AI agents during your subscription is yours to use, subject to OpenAI's usage policies. You retain ownership of any documents or data you upload to the platform.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">8. Service Availability</h2>
                  <p>
                    We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We may temporarily suspend access for maintenance, updates, or security reasons. We are not liable for any losses arising from service interruptions.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
                  <p>
                    To the maximum extent permitted by law, RentAI 24 shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">10. Termination</h2>
                  <p>
                    We may suspend or terminate your account if you violate these terms. You may close your account at any time by contacting us. Upon termination, your right to use the service ceases immediately, and we may delete your account data after a 30-day grace period.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">11. Changes to Terms</h2>
                  <p>
                    We reserve the right to modify these terms at any time. We will notify users of material changes via email or through the platform. Continued use of the service after changes constitutes acceptance of the new terms.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">12. Contact</h2>
                  <p>
                    For questions about these Terms of Service, please contact us at{" "}
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
