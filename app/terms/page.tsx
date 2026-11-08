// FILE: app/terms/page.tsx
import { LegalPage, Sec, UL } from '@/components/Legal'
import { SITE } from '@/lib/site'

export const metadata = { title: `Terms of Use | ${SITE.brand}` }

export default function Terms() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        These Terms of Use are an agreement between you and {SITE.company} (“we”, “us”) for your use of {SITE.brand} at{' '}
        {SITE.domain}. By creating an account or using the service you agree to these Terms, our{' '}
        <a className="font-semibold text-[#0f5c5a] underline" href="/privacy">Privacy Policy</a> and our{' '}
        <a className="font-semibold text-[#0f5c5a] underline" href="/guidelines">Community Guidelines</a>.
      </p>

      <Sec title="1. Who can use the service">
        <p>You must be at least 18 years old and able to enter into a legal contract. You must give correct information when you sign up and keep your login secure. You are responsible for activity on your account.</p>
      </Sec>

      <Sec title="2. Your content">
        <p>
          You own what you post. By posting, you give us a free, non-exclusive licence to store, display and share your
          content on the service so that it can work as intended. You are fully responsible for your content and promise
          that you have the right to post it.
        </p>
      </Sec>

      <Sec title="3. What you must not do">
        <p>You must not post, upload or share anything that:</p>
        <UL items={[
          'Is obscene, sexually explicit, pornographic or harmful to children.',
          'Is defamatory, harassing, threatening or invades another person’s privacy.',
          'Promotes hatred or violence against any person or group, or threatens the unity, integrity or security of India.',
          'Infringes anyone’s copyright, trademark or other rights.',
          'Is false or misleading, impersonates another person, or is a scam.',
          'Contains viruses or harmful code, or tries to break or misuse the service.',
          'Is otherwise illegal under the laws of India.',
        ]} />
      </Sec>

      <Sec title="4. How we handle content">
        <p>
          We do not approve normal posts before they go live. Content appears immediately and is reviewed after it is
          reported. You can report any post or comment using the Report option. We may remove content, limit features or
          suspend accounts that break these Terms or the law, with or without notice. We may also remove content when
          required by a court or government order. Content that is sponsored or paid advertising, and certain listings,
          may be reviewed before it is shown.
        </p>
      </Sec>

      <Sec title="5. Treat Creator (appreciation payments)">
        <p>
          When payments are enabled, you can send money to creators using Treat Creator. A treat is a voluntary payment
          and not a purchase of goods or services. A platform fee of {SITE.platformFeePercent}% is deducted from treats to
          creators; verified NGO campaigns are charged 0%. Creators can request a payout once their balance reaches ₹
          {SITE.minPayoutInr}. Payments are processed by our payment partner, and their terms also apply. Fees and
          limits may change and we will update this page when they do.
        </p>
      </Sec>

      <Sec title="6. Advertising">
        <p>
          Sponsored content is marked “Sponsored”. Advertisers are responsible for their ads and any claims they make.
          We are not a party to dealings between you and an advertiser.
        </p>
      </Sec>

      <Sec title="7. Marketplace and Matrimony">
        <p>
          When Bazaar (marketplace) and Matrimony are launched, additional terms will apply and will be shown before you
          use them. We are a platform that connects people. We do not guarantee the quality of items, the accuracy of a
          listing or profile, or the result of any match, and you should take your own care when dealing with others.
        </p>
      </Sec>

      <Sec title="8. Private messages and friends">
        <p>You can message only people who have accepted your friend request. Do not use messages for spam, abuse or fraud. We may restrict accounts that do.</p>
      </Sec>

      <Sec title="9. Ending your account">
        <p>You can stop using the service at any time and ask us to delete your account. We can suspend or end your account if you break these Terms or the law.</p>
      </Sec>

      <Sec title="10. Our responsibility">
        <p>
          The service is provided “as is”. We try to keep it available and safe but we do not promise that it will be
          error free or always available. To the extent allowed by law, we are not liable for content posted by users or
          for indirect or consequential losses. Nothing in these Terms limits any right you have under law that cannot be
          limited.
        </p>
      </Sec>

      <Sec title="11. Changes">
        <p>We may update these Terms. If you keep using the service after an update, you accept the new Terms. For important changes we will tell you inside the app.</p>
      </Sec>

      <Sec title="12. Governing law and contact">
        <p>
          These Terms are governed by the laws of India. Courts at {SITE.jurisdiction} have jurisdiction, subject to any
          rights you have under consumer law. For questions or complaints, see the{' '}
          <a className="font-semibold text-[#0f5c5a] underline" href="/contact">Contact and Grievance</a> page.
        </p>
      </Sec>
    </LegalPage>
  )
}
