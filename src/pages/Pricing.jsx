import React from 'react';

const plans = [
  {
    title: "Free Plan",
    price: "$0",
    features: [
      "Basic policy understanding",
      "Limited questions per day",
      "Community support"
    ],
    highlight: false
  },
  {
    title: "Pro Plan",
    price: "$9.99/mo",
    features: [
      "Unlimited policy questions",
      "Instant legal clause explanations",
      "Priority email support"
    ],
    highlight: true
  },
  {
    title: "Enterprise Plan",
    price: "Contact Us",
    features: [
      "Dedicated policy AI agent",
      "Bulk document support",
      "24/7 dedicated support",
      "Custom integration options"
    ],
    highlight: false
  }
];

function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-6 py-16 text-gray-800">
      <h1 className="text-4xl font-bold text-center text-indigo-700 mb-12">Choose Your Plan</h1>

      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`border rounded-2xl p-8 shadow-md transition hover:shadow-xl bg-white ${plan.highlight ? 'border-indigo-500 scale-105' : 'border-gray-200'}`}
          >
            <h2 className="text-2xl font-bold text-indigo-700 mb-4 text-center">{plan.title}</h2>
            <div className="text-center text-3xl font-extrabold mb-6 text-gray-900">{plan.price}</div>
            <ul className="space-y-3 text-gray-600 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <span className="text-green-500 mr-2">✔</span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex justify-center">
              <button className={`px-6 py-2 rounded-full text-white font-semibold ${plan.highlight ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 hover:bg-gray-500'}`}>
                {plan.title === 'Enterprise Plan' ? 'Contact Us' : 'Get Started'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pricing;
