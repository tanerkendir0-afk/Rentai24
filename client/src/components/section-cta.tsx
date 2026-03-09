import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function SectionCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-violet-600/20" />
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-cta-heading">
            Ready to Hire Your First AI Worker?
          </h2>
          <p className="text-muted-foreground text-lg mb-2 max-w-2xl mx-auto">
            Start your 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            No Setup Fee &middot; Cancel Anytime &middot; 14-Day Free Trial
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/pricing">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                data-testid="button-cta-start"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" data-testid="button-cta-demo">
                Book a Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
