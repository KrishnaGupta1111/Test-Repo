import React, { useEffect, useState } from 'react'
import { dummyBookingData } from '../../assets/assets';
import Title from '../../components/admin/Title';
import Loading from '../../components/Loading';

const ListBookings = () => {

  const currency=import.meta.env.VITE_CURRENCY 

  const[bookings,setBookings]=useState([]);
  const[isLoading,setIsLoading]=useState(true);

  const getAllBookings=async()=>{
    setBookings(dummyBookingData)
    setIsLoading(false);
  };

  useEffect(()=>{
    getAllBookings();
  },[])

  return !isLoading ? (
   <>
   <Title text1="List" text2="Bookings"/>
   <div className='max-w-4xl mt-6 overflow-x-auto'>
    <table className='w-full border-collapse  rounded-md overflow-hidden text-nowrap'>
      <thead>
        <tr className='bg-primary/20 text-left text-white'>
        <th className='p-2 font-medium pl-5'>User Name</th>
        <th className='p-2 font-medium '>Movie Name</th>
        <th className='p-2 font-medium '>Show Time</th>
        <th className='p-2 font-medium '>Seats</th>
        <th className='p-2 font-medium '>Amount</th>

        </tr>
      </thead>
    </table>
   </div>
   </>
   
  ) : (
    <Loading/>
  )
}


export default ListBookings
