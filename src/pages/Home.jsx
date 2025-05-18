import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chat from './Chat';

const sampleQuestions = [
  "What does this clause mean?",
  "Can I cancel my subscription anytime?",
  "Is my data being shared with third parties?"
];

const Home = () => {
  const [question, setQuestion] = useState('');
  const navigate = useNavigate();

  const handleSend = () => {
    if (question.trim()) {
      navigate('/chat', 
        { state: 
          { question } 
        }
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 via-white to-indigo-50 text-gray-800 font-sans">
      {/* Hero Chat Section */}
      <section className="flex flex-col items-center justify-center py-20 relative">
        <div className="text-3xl sm:text-5xl font-bold mb-6 text-center max-w-2xl">Ask Anything About Policies</div>
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your question here..."
            className="w-full px-6 py-4 rounded-full shadow-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleSend}
            className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full"
          >
            Send
          </button>
          <div className="absolute left-4 -bottom-8 text-sm text-gray-500 animate-pulse">
            {sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)]}
          </div>
        </div>
      </section>

      {/* Product Abstract Section */}
      <section className="py-16 px-6 md:px-20">
        <h2 className="text-3xl font-bold mb-6 text-indigo-700">Let's Keep it simple, Why PolicyAgent?</h2>
        <ul className="space-y-4 text-lg">
          <li>✅ Understand complex terms in plain English</li>
          <li>✅ Get instant answers from your policy documents</li>
          <li>✅ Save hours spent reading fine print</li>
          <li>✅ Accessible 24/7, personalized assistance</li>
          <li>✅ Ideal for individuals and businesses alike</li>
        </ul>
      </section>

      {/* Reviews Section */}
      <section className="bg-indigo-50 py-16 px-6 md:px-20">
        <h2 className="text-3xl font-bold mb-10 text-indigo-700 text-center">What Users Say</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((review) => (
            <div key={review} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition">
              <p className="italic mb-4">"PolicyAgent saved me from making a wrong decision. It's like having a legal expert on demand!"</p>
              <div className="font-semibold">- User {review}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white text-center px-6">
        <h2 className="text-4xl font-bold mb-4">Ready to simplify your policies?</h2>
        <p className="mb-8 text-lg">Start exploring with PolicyAgent today and gain clarity over your agreements.</p>
        <button
          onClick={() => navigate('/chat')}
          className="bg-white text-indigo-600 font-semibold px-8 py-3 rounded-full hover:bg-gray-100"
        >
          Start Chatting
        </button>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-500 py-6 text-sm">
        © {new Date().getFullYear()} PolicyAgent AI. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
