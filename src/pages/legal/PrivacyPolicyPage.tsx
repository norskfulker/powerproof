import { Link } from 'react-router-dom'
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_PATHS,
  LEGAL_SITE_URL,
  LEGAL_SUPPORT_EMAIL,
} from '@/lib/legal'

const MAILTO = `mailto:${LEGAL_SUPPORT_EMAIL}`

export function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      description="How PowerProof collects, uses, stores, and shares personal information when you use our website and founder tools."
      updatedOn={LEGAL_EFFECTIVE_DATE}
      canonicalPath={LEGAL_PATHS.privacy}
      sections={[
        {
          id: 'who-we-are',
          title: 'Who we are',
          content: (
            <>
              <p>
                This Privacy Policy explains how PowerProof (“PowerProof”, “we”, “us”, or “our”)
                handles personal information in connection with {LEGAL_SITE_URL} and the PowerProof
                products available there (together, the “Service”).
              </p>
              <p>
                PowerProof is a founder intelligence platform. It helps people research business
                ideas, test market demand, scan websites, source products, browse an investor
                library, and plan execution through roadmaps and a war-room workspace.
              </p>
              <p>
                For privacy questions or requests, email{' '}
                <a href={MAILTO}>{LEGAL_SUPPORT_EMAIL}</a>. This address is also our contact for
                grievances under applicable Indian data-protection law.
              </p>
            </>
          ),
        },
        {
          id: 'scope',
          title: 'Scope',
          content: (
            <>
              <p>This policy applies to personal information we process when you:</p>
              <ul>
                <li>visit or browse the Service as a guest;</li>
                <li>create an account or sign in (including Google and email one-time codes or magic links);</li>
                <li>use research, market-test, scanner, sourcing, library, roadmap, or war-room tools;</li>
                <li>buy a subscription, credits, or paid add-ons such as investor-list access;</li>
                <li>contact support, or otherwise communicate with us.</li>
              </ul>
              <p>
                It does not apply to third-party websites or products we may link to (supplier
                marketplaces, investor websites, payment pages, or social networks). Those services
                have their own policies.
              </p>
            </>
          ),
        },
        {
          id: 'information-we-collect',
          title: 'Information we collect',
          content: (
            <>
              <p>
                We collect information you provide, information created while you use the Service,
                and information from processors who help us operate it.
              </p>
              <p>
                <strong>Account and profile.</strong> Email address, name or display name, profile
                photo (if your sign-in provider supplies one), country or currency preference,
                onboarding answers, and account settings.
              </p>
              <p>
                <strong>Authentication.</strong> If you sign in with Google, we receive identifiers
                and basic profile data Google shares for that purpose. If you sign in with email, we
                process the address you enter and send a one-time code or sign-in link.
              </p>
              <p>
                <strong>Workspace content.</strong> Queries, drafts, research reports, market-test
                briefs, website scan URLs and reports, sourcing keywords and results you save, war-room
                playbooks, roadmaps, comments, and similar materials you create or upload.
              </p>
              <p>
                <strong>Payments.</strong> Plan selection, billing status, and transaction
                identifiers. Card and UPI details are collected by our payment processor (Razorpay),
                not stored in full on PowerProof servers.
              </p>
              <p>
                <strong>Usage and device.</strong> Pages viewed, features used, approximate location
                derived from IP address, browser type, device identifiers, timestamps, and
                diagnostic logs needed to keep the Service reliable and secure.
              </p>
              <p>
                <strong>Communications.</strong> Support emails, in-product messages, and
                transactional notices we send (for example, job completion or billing confirmations).
              </p>
            </>
          ),
        },
        {
          id: 'how-we-use',
          title: 'How we use information',
          content: (
            <>
              <p>We use personal information to:</p>
              <ul>
                <li>create and secure your account, and keep you signed in;</li>
                <li>deliver the features you request, including AI-assisted research and reports;</li>
                <li>process payments, subscriptions, credits, and access to paid libraries;</li>
                <li>remember preferences (such as display currency) and improve onboarding;</li>
                <li>send transactional messages about your account, jobs, and billing;</li>
                <li>monitor abuse, spam, fraud, and security incidents;</li>
                <li>understand product usage so we can fix bugs and improve the Service;</li>
                <li>comply with law and enforce our Terms of Service.</li>
              </ul>
              <p>
                We do not sell your personal information. We do not use your private workspace
                content to advertise unrelated third-party products to you.
              </p>
            </>
          ),
        },
        {
          id: 'legal-bases',
          title: 'Legal bases',
          content: (
            <>
              <p>
                Where a legal basis is required, we process personal information as needed to
                perform our contract with you (providing the Service you signed up for), to pursue
                legitimate interests such as security and product improvement in a way that does not
                override your rights, to meet legal obligations, and — where we ask for it — with
                your consent (for example optional analytics cookies or marketing emails, if
                offered).
              </p>
              <p>
                If you are in India, we process personal data in line with the Digital Personal Data
                Protection Act, 2023 and rules issued under it, including providing this notice,
                honouring consent where required, and offering a grievance channel.
              </p>
            </>
          ),
        },
        {
          id: 'ai-processing',
          title: 'AI processing',
          content: (
            <>
              <p>
                Several PowerProof tools send prompts and related context to large-language-model
                and other AI providers so we can generate research, verdicts, scans, roadmaps, and
                similar outputs. Those providers process the content needed to return a result.
              </p>
              <p>
                Do not include secrets you are not willing to process in this way (passwords, bank
                OTPs, unpublished personal data of others, or confidential third-party documents)
                unless you have the right to do so. Outputs can be incomplete or incorrect; they are
                not legal, financial, or investment advice. See our{' '}
                <Link to={LEGAL_PATHS.terms}>Terms of Service</Link> for use limitations.
              </p>
            </>
          ),
        },
        {
          id: 'payments',
          title: 'Payments',
          content: (
            <>
              <p>
                Paid plans, credits, and one-time purchases are processed by Razorpay. Razorpay may
                collect billing name, contact details, and payment-instrument data under its own
                privacy policy. We receive confirmation of payment status, amount, and identifiers
                needed to activate or cancel your plan.
              </p>
              <p>
                If a charge fails, is disputed, or is reversed, we may retain records required for
                accounting, fraud prevention, and tax compliance.
              </p>
            </>
          ),
        },
        {
          id: 'sharing',
          title: 'Who we share information with',
          content: (
            <>
              <p>
                We share personal information with vendors who process it on our instructions to
                operate the Service, including:
              </p>
              <ul>
                <li>infrastructure and database hosting (including Supabase);</li>
                <li>authentication providers (including Google, when you choose Google sign-in);</li>
                <li>payment processing (Razorpay);</li>
                <li>email delivery for sign-in codes, receipts, and product notifications;</li>
                <li>
                  analytics and product-quality tools, which may include Google Analytics, Microsoft
                  Clarity, and Meta Pixel when enabled;
                </li>
                <li>AI model providers used to generate workspace outputs.</li>
              </ul>
              <p>
                We may also disclose information if required by law, to protect rights and safety,
                or in connection with a merger, acquisition, or sale of assets, in which case we
                will take reasonable steps so the recipient honours this policy.
              </p>
            </>
          ),
        },
        {
          id: 'cookies',
          title: 'Cookies and similar technologies',
          content: (
            <>
              <p>
                We use cookies, local storage, and similar technologies to keep you signed in,
                remember preferences, measure performance, and understand how the Service is used.
                Essential cookies are required for login and security. Analytics cookies help us see
                which pages and features work; they may be set by us or by the analytics vendors
                listed above.
              </p>
              <p>
                You can control cookies through your browser. Blocking essential cookies may prevent
                sign-in or cause parts of the Service to fail.
              </p>
            </>
          ),
        },
        {
          id: 'retention',
          title: 'Retention',
          content: (
            <>
              <p>
                We keep account data and workspace content for as long as your account is active and
                as needed to provide the Service. After you delete an item or close your account, we
                remove or de-identify associated personal information within a reasonable period,
                except where we must retain records for security, dispute resolution, tax, or legal
                compliance (for example payment history).
              </p>
              <p>
                Backups and logs may persist for a limited time after deletion until they rotate in
                the ordinary course of operations.
              </p>
            </>
          ),
        },
        {
          id: 'security',
          title: 'Security',
          content: (
            <>
              <p>
                We use administrative, technical, and organisational measures appropriate to the
                nature of the Service, including encrypted transport, access controls, and vendor
                agreements. No method of transmission or storage is completely secure. You are
                responsible for keeping your sign-in method and devices under your control.
              </p>
            </>
          ),
        },
        {
          id: 'your-rights',
          title: 'Your rights',
          content: (
            <>
              <p>
                Subject to applicable law, you may request access to the personal information we
                hold about you, correction of inaccurate data, deletion of your account or specific
                content, withdrawal of consent where processing is based on consent, and information
                about how we use your data.
              </p>
              <p>
                To make a request, email <a href={MAILTO}>{LEGAL_SUPPORT_EMAIL}</a> from the address
                on your account. We may need to verify your identity before acting. If you are
                unsatisfied with our response, you may escalate through the grievance channel at the
                same address or, where available, to the relevant data-protection authority.
              </p>
              <p>
                You can also delete much of your workspace content yourself from the product, and
                you can stop using Google sign-in by disconnecting PowerProof in your Google account
                settings (this does not automatically delete PowerProof data until you ask us to).
              </p>
            </>
          ),
        },
        {
          id: 'children',
          title: 'Children',
          content: (
            <>
              <p>
                The Service is intended for adults who can form a binding contract. We do not
                knowingly collect personal information from children. If you believe a child has
                provided information to us, contact <a href={MAILTO}>{LEGAL_SUPPORT_EMAIL}</a> and
                we will take appropriate steps to delete it.
              </p>
            </>
          ),
        },
        {
          id: 'international',
          title: 'International processing',
          content: (
            <>
              <p>
                We may process and store information in India and in other countries where our
                vendors operate. Those countries may have different data-protection rules than your
                home country. We use contractual and organisational safeguards expected of a
                cloud-hosted product of this kind.
              </p>
            </>
          ),
        },
        {
          id: 'changes',
          title: 'Changes to this policy',
          content: (
            <>
              <p>
                We may update this Privacy Policy as the Service or the law changes. The effective
                date at the top will be revised when we do. Continued use of the Service after an
                update means you accept the revised policy, except where we are required to obtain a
                new consent.
              </p>
            </>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          content: (
            <>
              <p>
                Privacy and grievance requests:{' '}
                <a href={MAILTO}>{LEGAL_SUPPORT_EMAIL}</a>
              </p>
              <p>
                Website: <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL}</a>
              </p>
              <p>
                Related: <Link to={LEGAL_PATHS.terms}>Terms of Service</Link>
              </p>
            </>
          ),
        },
      ]}
    />
  )
}

export default PrivacyPolicyPage
