import { Link } from 'react-router-dom'
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_PATHS,
  LEGAL_SITE_URL,
  LEGAL_SUPPORT_EMAIL,
} from '@/lib/legal'

const MAILTO = `mailto:${LEGAL_SUPPORT_EMAIL}`

export function TermsOfServicePage() {
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      description="The rules that govern your use of PowerProof, including accounts, paid plans, AI outputs, and acceptable use."
      updatedOn={LEGAL_EFFECTIVE_DATE}
      canonicalPath={LEGAL_PATHS.terms}
      sections={[
        {
          id: 'agreement',
          title: 'Agreement',
          content: (
            <>
              <p>
                These Terms of Service (“Terms”) are a contract between you and PowerProof for use
                of {LEGAL_SITE_URL} and the PowerProof products available there (the “Service”).
              </p>
              <p>
                By creating an account, signing in, or using the Service, you agree to these Terms
                and to our <Link to={LEGAL_PATHS.privacy}>Privacy Policy</Link>. If you do not
                agree, do not use the Service.
              </p>
              <p>
                If you use PowerProof on behalf of a company, you represent that you have authority
                to bind that company, and “you” includes that company.
              </p>
            </>
          ),
        },
        {
          id: 'eligibility',
          title: 'Eligibility',
          content: (
            <>
              <p>
                You must be old enough to form a binding contract in your place of residence, and in
                any case not younger than 18. The Service is built for founders, operators, and
                similar professional users. You may not use it if you are barred from doing so under
                Indian law or other applicable law.
              </p>
            </>
          ),
        },
        {
          id: 'accounts',
          title: 'Accounts',
          content: (
            <>
              <p>
                You need an account to use most features. You may sign in with Google or with an
                email one-time code or magic link. You are responsible for activity under your
                account and for keeping access to your email or Google account secure.
              </p>
              <p>
                Provide accurate information and keep it current. Notify us promptly at{' '}
                <a href={MAILTO}>{LEGAL_SUPPORT_EMAIL}</a> if you believe your account has been
                misused.
              </p>
              <p>
                We may refuse, suspend, or close accounts that appear abusive, fraudulent, or in
                breach of these Terms.
              </p>
            </>
          ),
        },
        {
          id: 'service',
          title: 'The Service',
          content: (
            <>
              <p>PowerProof currently offers tools that may include:</p>
              <ul>
                <li>opportunity and idea research;</li>
                <li>market-test / demand-reality checks;</li>
                <li>website scans and related reports;</li>
                <li>product sourcing searches;</li>
                <li>an investor library and investor profiles;</li>
                <li>roadmaps and a war-room / playbook workspace.</li>
              </ul>
              <p>
                Features, limits, and branding may change as we improve the product. Some tools
                require a paid plan, credits, or a one-time unlock. We may add, modify, or retire
                features with notice where it is reasonable to do so.
              </p>
              <p>
                The Service may be unavailable from time to time for maintenance, vendor outages, or
                events beyond our control.
              </p>
            </>
          ),
        },
        {
          id: 'ai-outputs',
          title: 'AI-generated outputs',
          content: (
            <>
              <p>
                Much of the Service uses artificial intelligence to generate research, scores,
                scans, plans, and other text or structured content. Outputs are probabilistic. They
                can be incomplete, outdated, or wrong. They are for informational purposes only.
              </p>
              <p>
                PowerProof does not provide legal, tax, accounting, investment, or other regulated
                professional advice. You remain responsible for verifying facts, obtaining licences,
                speaking with qualified advisors, and making your own business decisions before you
                spend money or sign contracts.
              </p>
              <p>
                Do not rely on a single report as the sole basis for a high-stakes decision. Where
                the product cites sources or scores, treat them as starting points, not guarantees.
              </p>
            </>
          ),
        },
        {
          id: 'your-content',
          title: 'Your content',
          content: (
            <>
              <p>
                You retain ownership of prompts, ideas, documents, and other materials you submit
                (“User Content”). You grant PowerProof a worldwide, non-exclusive licence to host,
                process, transmit, and display User Content solely to operate, secure, and improve
                the Service for you, including sending it to AI and infrastructure vendors as
                needed to generate results.
              </p>
              <p>
                You represent that you have the rights to submit User Content and that it does not
                infringe others’ rights or violate law. You must not upload malware, others’
                personal data without a lawful basis, or confidential information you are not
                authorised to process.
              </p>
              <p>
                Generated outputs are licensed to you for your internal business use, subject to
                these Terms and any plan limits. We may use de-identified or aggregated usage data
                to improve the Service.
              </p>
            </>
          ),
        },
        {
          id: 'acceptable-use',
          title: 'Acceptable use',
          content: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>break the law or encourage others to do so;</li>
                <li>attempt to gain unauthorised access to accounts, systems, or data;</li>
                <li>probe, scrape, or overload the Service beyond ordinary interactive use, or resell raw model access;</li>
                <li>reverse engineer the Service except where the law allows;</li>
                <li>use outputs to impersonate people, spread malware, or generate unlawful content;</li>
                <li>interfere with other users’ use of the Service;</li>
                <li>misrepresent PowerProof reports as certified audits, legal opinions, or investment solicitations.</li>
              </ul>
              <p>
                We may rate-limit, throttle, or block traffic that looks automated or abusive.
              </p>
            </>
          ),
        },
        {
          id: 'plans-payments',
          title: 'Plans, credits, and payments',
          content: (
            <>
              <p>
                Some features require a paid subscription, credits, or a one-time purchase (for
                example investor-library access). Prices, entitlements, and billing intervals are
                shown at checkout. Payments are processed by Razorpay.
              </p>
              <p>
                Subscriptions renew automatically until you cancel in the product, where
                cancellation is offered, or by emailing <a href={MAILTO}>{LEGAL_SUPPORT_EMAIL}</a>.
                Cancellation typically takes effect at the end of the current paid period unless we
                state otherwise at checkout.
              </p>
              <p>
                Fees are generally non-refundable once a digital service has been made available,
                except where Indian consumer law or card-network rules require otherwise, or where
                we cannot deliver a paid feature due to a fault on our side. Credits, if offered,
                expire as described in the product and have no cash value.
              </p>
              <p>
                You are responsible for applicable taxes. We may change prices with notice for
                future periods; the new price applies from the next renewal after notice.
              </p>
            </>
          ),
        },
        {
          id: 'ip',
          title: 'PowerProof intellectual property',
          content: (
            <>
              <p>
                The Service, including software, design, trademarks (including PowerProof),
                documentation, and pre-built datasets we supply (such as catalog research or
                investor directory records we compile), is owned by PowerProof or its licensors.
                These Terms do not transfer ownership to you.
              </p>
              <p>
                You may not copy, crawl, or redistribute our compiled directories, reports, or
                interface except as the Service expressly allows for your own use.
              </p>
            </>
          ),
        },
        {
          id: 'third-parties',
          title: 'Third-party services',
          content: (
            <>
              <p>
                The Service links to or embeds third-party sites and tools (supplier listings,
                investor websites, Google, Razorpay, analytics, and AI providers). We are not
                responsible for their content, availability, or practices. Your use of those
                services is governed by their terms.
              </p>
            </>
          ),
        },
        {
          id: 'disclaimers',
          title: 'Disclaimers',
          content: (
            <>
              <p>
                THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE”. TO THE MAXIMUM EXTENT PERMITTED
                BY LAW, POWERPROOF DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
                INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
                NON-INFRINGEMENT.
              </p>
              <p>
                We do not warrant that outputs will be accurate, complete, current, or suitable for
                any particular transaction, or that the Service will be uninterrupted or error-free.
              </p>
            </>
          ),
        },
        {
          id: 'liability',
          title: 'Limitation of liability',
          content: (
            <>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, POWERPROOF AND ITS DIRECTORS, EMPLOYEES, AND
                SUPPLIERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF
                ADVISED OF THE POSSIBILITY.
              </p>
              <p>
                OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF THE SERVICE IN ANY TWELVE-MONTH
                PERIOD IS LIMITED TO THE AMOUNTS YOU PAID US FOR THE SERVICE IN THAT PERIOD, OR ONE
                THOUSAND INDIAN RUPEES (₹1,000) IF YOU HAVE PAID NOTHING.
              </p>
              <p>
                Some jurisdictions do not allow certain limitations. In those cases, the limitation
                applies to the fullest extent allowed.
              </p>
            </>
          ),
        },
        {
          id: 'indemnity',
          title: 'Indemnity',
          content: (
            <>
              <p>
                You will defend and indemnify PowerProof against claims, damages, and expenses
                (including reasonable legal fees) arising from your User Content, your use of the
                Service in breach of these Terms, or your violation of law or third-party rights.
              </p>
            </>
          ),
        },
        {
          id: 'termination',
          title: 'Suspension and termination',
          content: (
            <>
              <p>
                You may stop using the Service at any time and may request account deletion as
                described in the Privacy Policy. We may suspend or terminate access immediately if
                you breach these Terms, if required by law, or if we discontinue the Service.
              </p>
              <p>
                Sections that by their nature should survive (including intellectual property,
                disclaimers, limitation of liability, indemnity, and governing law) survive
                termination.
              </p>
            </>
          ),
        },
        {
          id: 'law',
          title: 'Governing law',
          content: (
            <>
              <p>
                These Terms are governed by the laws of India, without regard to conflict-of-law
                rules. Courts in India shall have exclusive jurisdiction, subject to any mandatory
                consumer-protection venue rights you may have.
              </p>
              <p>
                If a provision is held unenforceable, the rest remains in effect. These Terms are
                the entire agreement for the Service and supersede prior terms for the same subject.
                You may not assign these Terms without our consent; we may assign them in connection
                with a reorganisation or sale of the business.
              </p>
            </>
          ),
        },
        {
          id: 'changes',
          title: 'Changes',
          content: (
            <>
              <p>
                We may update these Terms. The effective date will change when we do. If a change is
                material, we will provide a reasonable notice in the product or by email where we
                have an address. Continued use after the effective date constitutes acceptance,
                except where the law requires your explicit consent.
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
                Questions about these Terms:{' '}
                <a href={MAILTO}>{LEGAL_SUPPORT_EMAIL}</a>
              </p>
              <p>
                Website: <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL}</a>
              </p>
              <p>
                Related: <Link to={LEGAL_PATHS.privacy}>Privacy Policy</Link>
              </p>
            </>
          ),
        },
      ]}
    />
  )
}

export default TermsOfServicePage
