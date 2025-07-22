import React from "react";
import { assets } from "../assets/assets";
import { FaInstagram, FaTwitter, FaFacebookF, FaYoutube } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="relative w-full text-gray-300 bg-gradient-to-b from-gray-900 via-black to-gray-950 pt-12 mt-40">
      <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-700 pb-10 px-4 sm:px-6 md:px-16 lg:px-36 z-10 relative">
        <div className="w-full md:max-w-96 flex flex-col items-center md:items-start text-center md:text-left">
          <img className="w-32 h-auto mb-4" src={assets.logo} alt="logo" />
          <p className="mb-6 text-xs sm:text-sm text-gray-400 max-w-xs">
            CineBook is your one-stop destination for booking movie tickets,
            discovering new releases, and enjoying the best of cinema. Download
            our app for exclusive offers!
          </p>
          <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
            <a href="#">
              <img
                src={assets.googlePlay}
                className="h-9 w-auto hover:scale-105 transition"
                alt="Google Play"
              />
            </a>
            <a href="#">
              <img
                src={assets.appStore}
                className="h-9 w-auto hover:scale-105 transition"
                alt="App Store"
              />
            </a>
          </div>
          <div className="flex gap-4 mt-6 justify-center md:justify-start">
            <a href="#" className="hover:text-primary">
              <FaInstagram size={20} />
            </a>
            <a href="#" className="hover:text-primary">
              <FaTwitter size={20} />
            </a>
            <a href="#" className="hover:text-primary">
              <FaFacebookF size={20} />
            </a>
            <a href="#" className="hover:text-primary">
              <FaYoutube size={20} />
            </a>
          </div>
        </div>
        <div className="w-full flex flex-col sm:flex-row items-center md:items-start md:justify-end gap-8 md:gap-20 text-center md:text-left">
          <div>
            <h2 className="font-semibold mb-3 text-base sm:text-lg text-white">
              Company
            </h2>
            <ul className="text-xs sm:text-sm space-y-2">
              <li>
                <a href="#" className="hover:text-primary">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  About us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Contact us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Privacy policy
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-3 text-base sm:text-lg text-white">
              Get in touch
            </h2>
            <div className="text-xs sm:text-sm space-y-2">
              <p>+1-234-567-890</p>
              <p>contact@cinebook.com</p>
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-3 text-base sm:text-lg text-white">
              Quick Links
            </h2>
            <ul className="text-xs sm:text-sm space-y-2">
              <li>
                <a href="#" className="hover:text-primary">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Support
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="pt-6 text-center text-xs text-gray-500 pb-6">
        &copy; {new Date().getFullYear()} CineBook. All Rights Reserved.
      </p>
    </footer>
  );
};

export default Footer;
