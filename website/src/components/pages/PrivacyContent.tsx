"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Mail, MapPin } from "lucide-react";

export function PrivacyContent() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-hashview-purple/10 to-transparent" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-hashview-purple/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-hashview-orange/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-hashview-purple/20 text-hashview-purple text-sm font-medium mb-6">
              Legal
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Privacy <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="prose prose-lg dark:prose-invert max-w-none"
            >
              {/* Introduction */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">1. Introduction</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  The Hashtag Services Ltd (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting it through our compliance with this Privacy Policy. This policy describes the types of information we may collect from you or that you may provide when you use the HASHVIEW mobile application (the &quot;App&quot;) and our practices for collecting, using, maintaining, protecting, and disclosing that information.
                </p>
              </div>

              {/* Information We Collect */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">2. Information We Collect</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may collect and process the following types of data:
                </p>
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-card border border-border">
                    <h3 className="font-display text-xl font-semibold mb-3 text-foreground">
                      a. Personal Information:
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Name</li>
                      <li>Email address</li>
                      <li>Phone number (if provided)</li>
                      <li>Location data (for real-time verification and verifying review authenticity)</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-2xl bg-card border border-border">
                    <h3 className="font-display text-xl font-semibold mb-3 text-foreground">
                      b. Usage Data:
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>App interactions (e.g., reviews posted, rewards redeemed)</li>
                      <li>Device information (e.g., device type, OS version)</li>
                      <li>IP address</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-2xl bg-card border border-border">
                    <h3 className="font-display text-xl font-semibold mb-3 text-foreground">
                      c. Location Data:
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We collect your real-time location to verify that you are physically present at a business location when leaving a review. In addition, we may track your location in the background (with your permission) to send relevant push notifications based on your current location, such as nearby offers or reminders to leave a review. Location data is used solely for enhancing the user experience and is handled in accordance with applicable data protection laws.
                    </p>
                  </div>
                </div>
              </div>

              {/* How We Use Your Information */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">3. How We Use Your Information</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Enable core app functions (e.g., posting verified reviews)</li>
                  <li>Provide and improve our services</li>
                  <li>Reward users via digital scratch cards</li>
                  <li>Communicate with users (e.g., app updates, promotions)</li>
                  <li>Maintain the security of our services</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>

              {/* Third Parties */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">4. Third Parties</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may share your information with:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-4">
                  <li>Partner businesses (e.g., anonymized review analytics)</li>
                  <li>Service providers (e.g., hosting, analytics)</li>
                  <li>Law enforcement or regulators if required by law</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed font-semibold">
                  We do not sell your personal information to third parties.
                </p>
              </div>

              {/* Cookies and Tracking Technologies */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">4A. Cookies and Tracking Technologies</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We use cookies and similar tracking technologies on our website to enhance user experience, analyze usage patterns, and deliver relevant content. Cookies help us understand how users interact with our site and may be used to remember preferences or settings.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  <strong className="text-foreground">Types of cookies we use:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-4">
                  <li><strong className="text-foreground">Essential Cookies:</strong> Required for core website functionality.</li>
                  <li><strong className="text-foreground">Analytics Cookies:</strong> Help us understand website traffic and performance.</li>
                  <li><strong className="text-foreground">Marketing Cookies:</strong> May be used to deliver personalized ads based on your browsing behavior.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  You can control cookie preferences through your browser settings. By continuing to use our website, you consent to our use of cookies in accordance with this policy.
                </p>
              </div>

              {/* Data Retention */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">5. Data Retention and Account Termination</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We retain your personal data for as long as you use the app or as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law. We will remove certain public posts from view and/or dissociate them from your account profile, but we may retain information about you for the purposes authorized under this Privacy Policy unless prohibited by law. For example, we may retain information to prevent, investigate, or identify possible wrongdoing in connection with the Service or to comply with legal obligations. We may also maintain residual copies of your personal information in our backup systems.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Please note that businesses cannot remove their business pages, ratings, or reviews by closing their accounts. HASHVIEW retains information for as long as reasonably necessary for the purposes for which it was collected, or as otherwise permitted or required by law.
                </p>
              </div>

              {/* Your Rights */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">6. Your Rights</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Under the UK General Data Protection Regulation (UK GDPR), you have the following rights regarding your personal data:
                </p>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-foreground font-semibold mb-1">Right to Access:</p>
                    <p className="text-muted-foreground">You have the right to request access to the personal data we hold about you.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-foreground font-semibold mb-1">Right to Rectification:</p>
                    <p className="text-muted-foreground">You have the right to request that we correct any inaccurate or incomplete data.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-foreground font-semibold mb-1">Right to Erasure:</p>
                    <p className="text-muted-foreground">You may request the deletion of your personal data, subject to certain exceptions allowed by law.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-foreground font-semibold mb-1">Right to Restrict Processing:</p>
                    <p className="text-muted-foreground">You have the right to request the restriction of processing under specific circumstances.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-foreground font-semibold mb-1">Right to Data Portability:</p>
                    <p className="text-muted-foreground">You can request that we transfer your personal data to another organisation or to you.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-foreground font-semibold mb-1">Right to Object:</p>
                    <p className="text-muted-foreground">You have the right to object to the processing of your personal data in some situations, including direct marketing.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-foreground font-semibold mb-1">Rights related to Automated Decision Making and Profiling:</p>
                    <p className="text-muted-foreground">You have the right not to be subject to a decision based solely on automated processing, including profiling.</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  To exercise your rights or if you have any questions regarding your personal data, please contact us at: <a href="mailto:info@hashview.co.uk" className="text-hashview-purple hover:underline">info@hashview.co.uk</a>. We may need to verify your identity before fulfilling your request. You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO), the UK&apos;s supervisory authority for data protection.
                </p>
              </div>

              {/* Security */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">7. Security</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your data from unauthorized access, use, alteration, or disclosure.
                </p>
              </div>

              {/* Children's Privacy */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">8. Children&apos;s Privacy</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  HASHVIEW is not intended for children under the age of 13. We do not knowingly collect personal data from children.
                </p>
              </div>

              {/* Changes to This Policy */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">9. Changes to This Policy</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify users of any changes by posting the new policy within the app and updating the effective date.
                </p>
              </div>

              {/* Contact Us */}
              <div className="mb-12 p-8 rounded-3xl bg-gradient-to-br from-hashview-purple/10 to-hashview-orange/10 border border-hashview-purple/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">10. Contact Us</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-hashview-purple/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Mail className="w-4 h-4 text-hashview-purple" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">Email:</p>
                      <a href="mailto:info@hashview.co.uk" className="text-hashview-purple hover:underline">
                        info@hashview.co.uk
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-hashview-purple/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <MapPin className="w-4 h-4 text-hashview-purple" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">Address:</p>
                      <p className="text-muted-foreground">
                        The Hashtag Services Ltd<br />
                        12 basement flat Lloyd Street<br />
                        Llandudno
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}

