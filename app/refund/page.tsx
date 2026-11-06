// FILE: app/refund/page.tsx
import { LegalPage, Sec, UL } from '@/components/Legal'
import { SITE } from '@/lib/site'

export const metadata = { title: `Refund and Cancellation Policy | ${SITE.brand}` }

export default function Refund() {
  return (
    <LegalPage title="Refund and Cancellation Policy">
      <p>
        This policy explains refunds and cancellations for payments made on {SITE.brand}. Payments are processed by our
        payment partner. Please read it together with our{' '}
        <a className="font-semibold text-[#0f5c5a] underline" href="/terms">Terms of Use</a>.
      </p>

      <Sec title="1. Treat Creator payments">
        <p>
          A treat is a voluntary appreciation payment to a creator. Once a payment has been successfully completed, it
          cannot be cancelled or refunded, except in the cases below.
        </p>
        <UL items={[
          'You were charged more than once for the same treat.',
          'Money was deducted from your account but the treat was not completed.',
          'The payment was made without your authorisation.',
        ]} />
        <p>In these cases, write to us within 7 days with your payment reference and we will review it.</p>
      </Sec>

      <Sec title="2. Donations to verified NGO campaigns">
        <p>
          Donations are given to the NGO and are generally not refundable. If you were charged by mistake, contact us
          within 7 days and we will help get it corrected.
        </p>
      </Sec>

      <Sec title="3. Paid features such as Matrimony">
        <p>
          Paid memberships and services are not available yet. The price, validity and refund terms for each one will be
          published on this page before it is launched.
        </p>
      </Sec>

      <Sec title="4. Advertising">
        <p>
          Advertising is booked by agreement. If we fail to show a booked ad because of our own error or because we pause
          it without a fault on your part, we will extend the run or refund the unused part, as agreed in writing.
        </p>
      </Sec>

      <Sec title="5. How refunds are paid">
        <p>
          Approved refunds are sent to the original payment method. After we approve a refund, it usually reaches your
          account within 5 to 7 working days, depending on your bank or payment provider.
        </p>
      </Sec>

      <Sec title="6. How to ask for a refund">
        <p>
          Email {SITE.supportEmail} with your registered email, the date and amount of the payment, and the payment
          reference number. If you are not satisfied with our reply, you can write to our Grievance Officer listed on the{' '}
          <a className="font-semibold text-[#0f5c5a] underline" href="/contact">Contact and Grievance</a> page.
        </p>
      </Sec>
    </LegalPage>
  )
}
