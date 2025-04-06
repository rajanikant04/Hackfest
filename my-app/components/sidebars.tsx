// "use client";
// import { Mail, Inbox, ShieldX, Send } from "lucide-react";
// import { useRouter } from "next/navigation";

// const menuItems = [
//   // { icon: Mail, label: "All Mails", path: "/mail" },
//   { icon: Inbox, label: "Inbox", path: "/category/inbox" },
//   { icon: Send, label: "Sent", path: "/category/sent" },
//   { icon: ShieldX, label: "Spam", path: "/category/spam" },
// ];

// const Sidebar = () => {
//   const router = useRouter();

//   return (
//     <div className="h-screen bg-gray-900 text-white flex flex-col items-start px-4 pt-19">
//       <ul className="mt-6 space-y-6 w-full">
//         {menuItems.map(({ icon: Icon, label, path }) => (
//           <li
//             key={label}
//             onClick={() => router.push(path)}
//             className="flex items-center w-full gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-700"
//           >
//             <Icon size={24} />
//             <span>{label}</span>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default Sidebar;
"use client";
import { Mail, Inbox, ShieldX, Send, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

const menuItems = [
  // { icon: Mail, label: "All Mails", path: "/mail" },
  { icon: Inbox, label: "Inbox", path: "/category/inbox" },
  { icon: Send, label: "Sent", path: "/category/sent" },
  { icon: ShieldX, label: "Spam", path: "/category/spam" },
];

const Sidebar = () => {
  const router = useRouter();

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col justify-between px-4 pt-6 pb-10">
      {/* Top Menu */}
      <ul className="mt-20 space-y-6 w-full">
        {menuItems.map(({ icon: Icon, label, path }) => (
          <li
            key={label}
            onClick={() => router.push(path)}
            className="flex items-center w-full gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-700">
            <Icon size={24} />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      {/* Credit Box */}
      <div className="w-full bg-gray-800 text-white rounded-lg p-4  flex items-center mb-10 justify-between gap-3 shadow-inner">
        <div>
          <p className="text-sm font-medium">Credits</p>
          <p className="text-xs text-gray-400">View your plan & usage</p>
        </div>
        <CreditCard size={20} className="text-purple-400" />
      </div>
    </div>
  );
};

export default Sidebar;

