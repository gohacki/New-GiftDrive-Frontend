import React from 'react';

import Admin from "layouts/Admin.js";

const HelpPage = () => {
  const faqItems = [
    {
      question: "How do I create a new drive?",
      answer: "You can create a new drive by navigating to the 'Current Drives' section and clicking on the 'Add New Drive' button.",
    },
    {
      question: "How do I edit a drive?",
      answer: "To edit a drive, click the 'Edit' button on the relevant drive card in the Current Drives section.",
    },
    {
      question: "How do I delete a drive?",
      answer: "Click the 'Delete' button on the drive card. Please note that this action is irreversible.",
    },
    {
      question: "What is a drive?",
      answer: "A drive is a campaign where organizations collect donations or gifts for a specific purpose or group.",
    },
    {
      question: "How do I contact support?",
      answer: "You can contact support by sending an email to support@example.com.",
    },
  ];

  return (
    <div className="p-6"> {/* Removed min-h-screen, bg-gray-100, pt-32 */}
      <h2 className="text-2xl font-semibold mb-6 text-slate-800">Help & FAQ</h2> {/* Increased mb, changed color */}

      <div className="space-y-6">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200" /* Added rounded-lg, border */
          >
            <h3 className="text-lg font-medium text-ggreen">{item.question}</h3> {/* Changed color */}
            <p className="text-slate-600 mt-2">{item.answer}</p> {/* Changed color */}
          </div>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200"> {/* Added pt and border-t for separation */}
        <h3 className="text-lg font-semibold mb-2 text-slate-700">Need Further Assistance?</h3> {/* Changed color, increased font-semibold */}
        <p className="text-slate-600"> {/* Changed color */}
          If your question isn&apos;t listed above, please reach out to our support team at:
        </p>
        <a
          href="mailto:support@example.com"
          className="text-ggreen hover:underline hover:text-teal-700" /* Changed color and hover */
        >
          support@example.com
        </a>
      </div>
    </div>
  );
};

HelpPage.layout = Admin;

export default HelpPage;