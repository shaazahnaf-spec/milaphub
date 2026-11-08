// FILE: app/privacy/page.tsx
import { LegalPage, Sec, UL } from '@/components/Legal'
import { SITE } from '@/lib/site'

export const metadata = { title: `Privacy Policy | ${SITE.brand}` }

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains how {SITE.company} (“we”, “us”) collects, uses and protects your personal data when
        you use {SITE.brand} at {SITE.domain}. By creating an account you agree to this policy.
      </p>

      <Sec title="1. Information we collect">
        <UL items={[
          'Account details: your email address, name, username, state, city and locality.',
          'Content you create: posts, comments, replies, likes, saved posts, friend requests, reports and messages.',
          'Uploads: images and videos that you upload, for example in posts or, for advertisers, in ads.',
          'Technical data: device and browser type, IP address and basic logs needed to keep the service secure and working.',
          'Payment information, once payments are enabled: payment status and transaction identifiers from our payment partner. We do not store your card number, UPI PIN or net banking details.',
          'Identity documents: if you use verification features such as Matrimony in future, we will ask for your separate and explicit consent and explain how those documents are handled before you upload anything.',
        ]} />
      </Sec>

      <Sec title="2. How we use your information">
        <UL items={[
          'To create and secure your account and show you content from your city.',
          'To deliver posts, comments and private messages, and to show friend requests and notifications.',
          'To prevent spam, abuse and fraud, and to enforce our Terms of Use and Community Guidelines.',
          'To show advertisements and to tell advertisers how many times their ad was seen or clicked. These reports are totals and do not name you.',
          'To process payments and payouts when those features are available.',
          'To respond to your complaints and to lawful requests from authorities.',
        ]} />
      </Sec>

      <Sec title="3. What other people can see">
        <p>
          Your name, username and city can be seen by other users. Your posts are visible to people on the platform.
          Posts in the Confessions category show “Anonymous” to other users, but we keep the link to your account so that
          we can act on legal complaints and abuse. Private messages are visible only to you and the person you are
          chatting with. We access them only when needed to investigate a report, prevent harm or follow the law.
        </p>
      </Sec>

      <Sec title="4. Who we share data with">
        <p>We do not sell your personal data. We share data only with:</p>
        <UL items={[
          'Service providers that help us run the platform, such as Supabase (database, login and file storage), Vercel (hosting), an email delivery provider for login codes, and our payment partner when payments are enabled.',
          'Government or law enforcement authorities, when we are legally required to do so.',
          'A new owner, if our business is merged or sold, in which case we will inform you.',
        ]} />
      </Sec>

      <Sec title="5. Advertising">
        <p>
          We show sponsored content marked “Sponsored”. Ads may be shown based on your city. We do not give advertisers
          your personal data. If you click an ad you will go to the advertiser’s own website, which has its own privacy
          practices.
        </p>
      </Sec>

      <Sec title="6. Cookies and local storage">
        <p>
          We use essential cookies and similar storage to keep you signed in and to keep the service secure. We do not
          use advertising or tracking cookies at present. If we add analytics, we will update this policy first.
        </p>
      </Sec>

      <Sec title="7. How long we keep data">
        <p>
          We keep your data while your account is active. If you ask us to delete your account, we will delete or
          anonymise your personal data within 30 days, except records we must keep by law (for example payment and tax
          records) and content needed to resolve an open complaint. Deleted content may remain in backups for a limited
          period before it is overwritten.
        </p>
      </Sec>

      <Sec title="8. Security">
        <p>
          We use encryption in transit, access controls and database rules that limit who can read your data. No system
          is completely secure. If a data breach affects you, we will inform you and the authorities as required by law.
        </p>
      </Sec>

      <Sec title="9. Your rights">
        <p>You can ask us to:</p>
        <UL items={[
          'Give you a copy of the personal data we hold about you.',
          'Correct or update inaccurate data.',
          'Delete your data and account.',
          'Withdraw your consent for any optional use of your data.',
          'Nominate another person to exercise your rights on your behalf if you are unable to.',
        ]} />
        <p>
          To use any of these rights, or to make a complaint, write to our Grievance Officer using the details on the{' '}
          <a className="font-semibold text-[#0f5c5a] underline" href="/contact">Contact and Grievance</a> page.
        </p>
      </Sec>

      <Sec title="10. Age limit">
        <p>
          {SITE.brand} is for people aged 18 years or older. We do not knowingly collect data from children. If you
          believe a child has created an account, please contact us and we will remove it.
        </p>
      </Sec>

      <Sec title="11. Law that applies">
        <p>
          We follow the Information Technology Act, 2000 and its rules, and the Digital Personal Data Protection Act,
          2023 as its provisions come into force.
        </p>
      </Sec>

      <Sec title="12. Changes to this policy">
        <p>
          We may update this policy from time to time. We will change the “Last updated” date above and, for important
          changes, tell you inside the app.
        </p>
      </Sec>
    </LegalPage>
  )
}
