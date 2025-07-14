import stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

export const stripeWebhooks = async (request, response) => {
  console.log("Stripe webhook endpoint hit");
  // 🧪 Debug: Check if webhook is hit
  console.log("🎯 Webhook endpoint hit");
  console.log("Stripe-Signature:", request.headers["stripe-signature"]);

  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    // 🧪 Debug: Constructing event
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Stripe event constructed successfully:", event.type);
  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        // 🧪 Debug: List sessions to find metadata
        const sessionList = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        const session = sessionList.data[0];
        if (!session) {
          console.error("❌ No session found for payment_intent");
          return response.status(404).send("Session not found");
        }

        const { bookingId } = session.metadata;
        console.log("📦 Booking ID from Stripe metadata:", bookingId);

        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: " ",
        });

        console.log("✅ Booking marked as paid in DB");

        // Trigger Inngest event to send email
        await inngest.send({
          name: "app/show.booked",
          data: { bookingId },
        });

        console.log("📨 Confirmation email triggered");
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return response.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return response.status(500).send("Internal Server Error");
  }
};
