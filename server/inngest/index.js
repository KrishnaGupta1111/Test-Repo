import { Inngest } from "inngest";
import User from "../models/User.js"
import Booking from "../models/Booking.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

const syncUserCreation = inngest.createFunction(
    {id:'sync-user-from-clerk'},
    {event:'clerk/user.created'},
    async({event})=>{
        const {id,first_name , last_name , email_addresses , image_url}=event.data;
        const userData={
            _id:id,
            email:email_addresses[0].email_address,
            name:first_name + ' ' + last_name,
            image:image_url
        }
        await User.create(userData)
    }
)

//Inngest function to delete user from database
const syncUserDeletion=inngest.createFunction(
    {id:'delete-user-with-clerk'},
    {event:'clerk/user.deleted'},
    async({event})=>{
        const {id}=event.data
        await User.findByIdAndDelete(id)
    }
)

const syncUserUpdation = inngest.createFunction(
    {id:'update-user-from-clerk'},
    {event:'clerk/user.updated'},
    async({event})=>{
        const {id,first_name,last_name,email_addresses,image_url}=event.data;
        const userData = {
          _id: id,
          email: email_addresses[0].email_address,
          name: first_name + " " + last_name,
          image: image_url,
        };
        await User.findByIdAndUpdate(id,userData);
    }
)

//Inngest function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made

const releaseSeatsAndDeleteBooking=inngest.createFunction(
    {id:'release-seats-delete-booking'},
    {event:'app/checkpayment'},
    async({event,step})=>{
        const tenMinutesLater=new Date(Date.now()+10*60*1000);
        await step.sleepUntil('wait-for-10-minutes',tenMinutesLater);

        await step.run('check-payment-status',async()=>{
            const bookingId=event.data.bookingId;
            const booking=await Booking.findByiD(bookingId)

            if(!booking.isPaid){
              show.markModified('occupiedSeats')
              await show.save()
              await Booking.findByIdAndDelete(booking._id)
            }
        })
    }
)

//Inngest function to send email when user books a show

const sendBookingConfirmationEmail=inngest.createFunction(
    {id:"send-booking-confirmation-email"},
    {event:"app/show.booked"},
    async({event,step})=>{
        const {bookingId}=event.data;
        const booking = await Booking.findById(bookingId).populate({
            path:'show',
            populate:{path:"movie",model:"Movie"}
        }).populate('user');
    }
)

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking

];
