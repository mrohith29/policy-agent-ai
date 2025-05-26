import React from 'react';
import { Check } from 'lucide-react';
import Button from './Button';

const PricingCard = ({ plan }) => {
  return (
    <div 
      className={`
        relative overflow-hidden rounded-2xl transition-all duration-300
        ${plan.highlight 
          ? 'border-2 border-indigo-500 shadow-xl transform hover:-translate-y-1' 
          : 'border border-gray-200 shadow-subtle hover:shadow-elevated hover:-translate-y-0.5'
        }
        bg-white p-8
      `}
    >
      {plan.highlight && (
        <div className="absolute top-0 right-0">
          <div className="h-24 w-24 transform translate-x-12 -translate-y-12 rotate-45 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <span className="absolute top-5 right-5 text-xs text-white font-semibold transform rotate-45">Popular</span>
        </div>
      )}
      
      <h3 className={`
        text-xl font-bold mb-2
        ${plan.highlight ? 'text-indigo-700' : 'text-gray-800'}
      `}>
        {plan.title}
      </h3>
      
      <div className="mt-4 mb-6">
        <span className="text-4xl font-extrabold">{plan.price.split('/')[0]}</span>
        {plan.price.includes('/') && (
          <span className="text-gray-500 font-medium">{`/${plan.price.split('/')[1]}`}</span>
        )}
      </div>
      
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start">
            <span className={`
              mr-2 flex-shrink-0 rounded-full p-1 
              ${plan.highlight ? 'text-indigo-500 bg-indigo-50' : 'text-green-500 bg-green-50'}
            `}>
              <Check size={14} />
            </span>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Button 
        variant={plan.highlight ? 'primary' : 'secondary'} 
        className="w-full justify-center"
      >
        {plan.title === 'Enterprise Plan' ? 'Contact Us' : 'Get Started'}
      </Button>
    </div>
  );
};

export default PricingCard;