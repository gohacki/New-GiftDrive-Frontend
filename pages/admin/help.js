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
    <div className="min-h-screen bg-gray-100 p-6 pt-32">
      <h2 className="text-2xl font-semibold mb-4">Help & FAQ</h2>

      <div className="space-y-6">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className="bg-white p-4 rounded shadow-md hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-medium">{item.question}</h3>
            <p className="text-gray-600 mt-2">{item.answer}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-medium mb-2">Need Further Assistance?</h3>
        <p className="text-gray-600">
          If your question isn&apos;t listed above, please reach out to our support team at:
        </p>
        <a
          href="mailto:support@example.com"
          className="text-blue-500 hover:underline"
        >
          support@example.com
        </a>
      </div>
    </div>
  );
};

HelpPage.layout = Admin;

export default HelpPage;