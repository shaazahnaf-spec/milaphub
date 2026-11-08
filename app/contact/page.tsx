// FILE: app/contact/page.tsx
import { LegalPage, Sec } from '@/components/Legal'
import { SITE } from '@/lib/site'

export const metadata = { title: `Contact and Grievance | ${SITE.brand}` }

export default function Contact() {
  const g = SITE.grievance
  return (
    <LegalPage title="Contact and Grievance">
      <Sec title="Contact us">
        <p>
          {SITE.company}<br />
          {SITE.address}
        </p>
        <p>
          Support and general questions:{' '}
          <a className="font-semibold text-[#0f5c5a] underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
          <br />
          Advertising:{' '}
          <a className="font-semibold text-[#0f5c5a] underline" href={`mailto:${SITE.adsEmail}`}>{SITE.adsEmail}</a>
        </p>
      </Sec>

      <Sec title="Grievance Officer">
        <p>
          In line with the Information Technology Act, 2000 and the rules made under it, you can send complaints about
          content, your account or your data to our Grievance Officer:
        </p>
        <p>
          Name: {g.name}<br />
          Designation: {g.designation}<br />
          Email:{' '}
          <a className="font-semibold text-[#0f5c5a] underline" href={`mailto:${g.email}`}>{g.email}</a>
          <br />
          Phone: {g.phone}<br />
          Address: {SITE.address}
        </p>
        <p>
          We acknowledge every complaint within 24 hours and aim to resolve it within 15 days. Complaints about nudity,
          sexual content or impersonation are acted on within 24 hours.
        </p>
      </Sec>

      <Sec title="Report something quickly">
        <p>
          To report a post or comment, use the Report option in the three dot menu next to a post, or Report under a
          comment. You do not need to email us for this.
        </p>
      </Sec>
    </LegalPage>
  )
}
