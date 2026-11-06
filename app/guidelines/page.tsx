// FILE: app/guidelines/page.tsx
import { LegalPage, Sec, UL } from '@/components/Legal'
import { SITE } from '@/lib/site'

export const metadata = { title: `Community Guidelines | ${SITE.brand}` }

export default function Guidelines() {
  return (
    <LegalPage title="Community Guidelines">
      <p>
        {SITE.brand} is a place for people in the same city to talk, share and help each other. You are free to share
        your views, stories and recipes. These rules keep the space safe for everyone.
      </p>

      <Sec title="Be respectful">
        <UL items={[
          'Disagree with ideas, not with people. No abuse, bullying or targeted harassment.',
          'No hate speech against any religion, caste, gender, region, language or community.',
          'No threats or calls for violence.',
        ]} />
      </Sec>

      <Sec title="Keep it safe and legal">
        <UL items={[
          'No nudity, sexual content or anything that harms children.',
          'No illegal activity, scams, fake offers or fraud.',
          'No sharing of other people’s private information, photos or messages without their permission.',
          'Do not post content you do not have the right to share, such as copied videos or articles.',
        ]} />
      </Sec>

      <Sec title="Be honest">
        <UL items={[
          'Do not pretend to be someone else.',
          'Do not spread false news that can cause harm or panic.',
          'Do not spam. No repeated or unwanted promotion in posts, comments or messages.',
          'Only verified NGOs can run Campaigns. Fake appeals for money will lead to a permanent ban.',
        ]} />
      </Sec>

      <Sec title="Confessions">
        <p>
          Confessions show as Anonymous to other users, but they must follow the same rules. Anonymous posts that break
          the law can be traced to the account that posted them.
        </p>
      </Sec>

      <Sec title="Reporting and what happens next">
        <p>
          Use the Report option on any post or comment. Our team reviews reports and can delete content, limit an account
          or remove it permanently. Serious or repeated violations can lead to a permanent ban and, where the law
          requires, a report to the authorities. If you think we made a mistake, write to us using the details on the{' '}
          <a className="font-semibold text-[#0f5c5a] underline" href="/contact">Contact and Grievance</a> page.
        </p>
      </Sec>
    </LegalPage>
  )
}
