"use client";
import React, { useEffect, useState } from "react";
import { Atom, Mail, Star, Zap, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

function LandingPage() {
  const [imageUrl, setImageUrl] = useState("default.jpg");
  const [scrolled, setScrolled] = useState(false);

  const router = useRouter(); // Initialize router

  const handleGetStarted = () => {
    router.push("/sign-in"); // Navigate to sign-in page
  };
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className=" min-h-screen  w-screen bg-gradient-to-br from-purple-950 to-black text-white">
      {/* Navigation */}
      <nav
        className={`fixed w-full z-60 translation-all flex justify-between items-center p-6 ${scrolled ? "bg-black/30 backdrop-blur-lg" : ""}`}>
        <div className="flex items-center space-x-2">
          <img src="flow.png" alt="Logo" className="w-40 h-10 rounded-full" />
        </div>
        <div className="flex items-center space-x-6">
          <button
            onClick={handleGetStarted}
            className="cursor-pointer text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 ">
            My Inbox
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20 text-center ">
        <div className="flex text-start rounded-xl relative xl:max-w-[1094px] justify-center items-start mx-auto  ">
          <div className="flex items-start">
            <motion.img
              src="logo.webp"
              alt="logo"
              className="inline-block rounded-md md:rounded-xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="flex items-end">
            <h1
              suppressHydrationWarning={true}
              className="font-black justify-center items-center text-white text-[20px] md:text-[30px] ml-8 lg:text-[40px] xl:text-[50px] mb-12 md:mb-15 lg:mb-20 ">
              Revolutionize your Inbox
              <p suppressHydrationWarning={true}>
                with{" "}
                <span className="bg-gradient-to-br from-green-400 to-blue-600 bg-clip-text text-transparent ">
                  Atom Mail
                </span>
              </p>
            </h1>
          </div>
        </div>

        <p className="text-xl text-gray-400 mb-8">
          AI-driven email tools that adapt to your needs and streamline your
          communication
        </p>
        <button
          onClick={handleGetStarted}
          className="bg-white cursor-pointer text-blue-400 px-12 py-4 rounded-4xl text-xl font-semibold transition-all duration-300 hover:shadow-[0_6px_15px_rgba(255,255,255,0.7)]">
          Get Started for Free
        </button>

        {/* Dashboard Preview */}
        <div className="mt-16 relative">
          <div className="bg-gradient-to-t from-gray-900 to-transparent absolute inset-0 z-10"></div>
          <img
            src="mainlading.png"
            alt="Dashboard Preview"
            className="rounded-2xl shadow-2xl border-white border-16 "
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 ">
            AI-driven email tools that adapt to your needs
          </h2>
          <p className="bg-gradient-to-br from-green-400 to-blue-600 bg-clip-text text-transparent text-3xl font-bold">
            Stay Ahead of the Curve
          </p>
        </div>

        {/* Image Switcher Section */}
        <div className="flex flex-col md:flex-row items-center gap-4 mt-12">
          {/* Left Image Section */}
          <div className="flex-1 flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Feature Image"
              className="rounded-lg shadow-lg transition-all duration-500 w-[700px] h-[400px] object-cover"
            />
          </div>

          {/* Right Buttons Section */}
          <div className="flex flex-col gap-4 justify-centerc">
            <button
              className="btn hover:scale-110 flex items-center gap-2 px-8 py-4 bg-gradient-to-br from-purple-700 to-black rounded-lg hover:bg-gray-700 transition-all font-bold"
              onMouseOver={() => setImageUrl("chatbotFrame.png")}>
              🤖 Integrated AI Chatbot
            </button>
            <button
              className="btn flex hover:scale-110 items-center gap-2 px-8 py-4 bg-gradient-to-br from-purple-800 to-black rounded-lg hover:bg-gray-700 transition-all font-bold"
              onMouseOver={() => setImageUrl("composeAi.png")}>
              📝 Smart Compose with AI Refinement
            </button>
            <button
              className="btn flex hover:scale-110 items-center gap-2 px-8 py-4 bg-gradient-to-br from-purple-900 to-black rounded-lg hover:bg-gray-700 transition-all font-bold"
              onMouseOver={() => setImageUrl("templating.png")}>
              📄 Custom User Prompt Templates
            </button>
          </div>
        </div>
      </div>

      {/* Features Cards Section */}
      <div className="text-white flex justify-center items-center  min-h-screen">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold">
            Secure and Standard way of communicating with your customers
          </h2>

          <div className="flex justify-center gap-4 bg-gray-900 p-4 rounded-xl">
            <div className="flex items-center bg-white text-black rounded-full px-6 py-3">
              <span className="bg-purple-500 text-white rounded-full p-2">
                ✔️
              </span>
              <p className="ml-2 font-medium">Smart Inbox Filtering</p>
            </div>
            <div className="flex items-center bg-white text-black rounded-full px-6 py-3">
              <span className="bg-purple-500 text-white rounded-full p-2">
                ✔️
              </span>
              <p className="ml-2 font-medium">AI-Based Response Suggestions</p>
            </div>
            <div className="flex items-center bg-white text-black rounded-full px-6 py-3">
              <span className="bg-purple-500 text-white rounded-full p-2">
                ✔️
              </span>
              <p className="ml-2 font-medium">Lightning-Fast Delivery</p>
            </div>
          </div>

          {/* <button className="px-6 py-3 rounded-full bg-white text-purple-600 font-bold shadow-lg hover:bg-gray-200 transition-all">
            See all Pricing Plans
          </button> */}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8">
            Use Business Email - Increase your business visibility and stand out
            among competition
          </h2>
          <button
            onClick={handleGetStarted}
            className="bg-white hover:scale-120 text-purple-900 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-semibold transition-colors">
            Start Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-10 px-4 md:px-12 lg:px-32 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-start">
          <div className="mb-6 md:mb-0">
            <img src="atomai.webp" alt="Logo" className="w-28 mb-2" />
            <h2 className="text-lg font-semibold">atom•ai</h2>
          </div>

          <div className="flex  gap-16">
            <div>
              <h3 className="font-bold mb-3 text-2xl text-black">Compare</h3>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <a href="#">Google Workspace</a>
                </li>
                <li>
                  <a href="#">Zoho Mail</a>
                </li>
                <li>
                  <a href="#">Outlook</a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 text-2xl text-black">Contact Us</h3>
              <ul className="space-y-2 text-gray-600">
                <li>
                  📞 Call Us:{" "}
                  <span className="text-black font-semibold">
                    +91 8879138857
                  </span>
                </li>
                <li>
                  📍 Address: NIT Rourkela
                </li>
                <li>
                  📧 Mail Us:{" "}
                  <a
                    href="mailto:mishralucky074@gmail.com"
                    className="text-purple-600">
                    Gmail.com
                  </a>
                </li>
              </ul>
              <div className="flex  gap-6 mt-3">
                <a href="#">
                  <img src="facebook.png" className="w-8 h-8" />
                </a>
                <a href="#">
                  <img src="twitter.png" className="w-8 h-8" />
                </a>
                <a href="#">
                  <img src="linkedin.png" className="w-8 h-8" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-between items-center text-gray-600 text-sm">
          <p className="bg-gradient-to-br from-green-400 to-blue-600 bg-clip-text text-transparent ">
            ©2025 Floww APIs Pvt. Ltd.
          </p>
          <div className="flex space-x-6">
            <a href="#">Privacy Policy</a>
            <a href="#">Refund Policy</a>
            <a href="#">Terms & Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
