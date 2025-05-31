'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

const LandingPage = () => {
  // Tracks which FAQ is open
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Track active section for nav dots
  const [activeSection, setActiveSection] = useState('hero');
  
  // Refs for each section
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const workflowRef = useRef(null);
  const testimonialsRef = useRef(null);
  const faqRef = useRef(null);
  const ctaRef = useRef(null);

  // Set up intersection observer for sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );
    
    // Observe all sections
    [heroRef, featuresRef, workflowRef, testimonialsRef, faqRef, ctaRef].forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });
    
    return () => {
      // Clean up observer
      [heroRef, featuresRef, workflowRef, testimonialsRef, faqRef, ctaRef].forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, []);

  // Function to scroll to section when nav dot is clicked
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <div className={styles.landingPage}>
      {/* Navigation Dots (desktop only) */}
      <div className={styles.navDots}>
        {['hero', 'features', 'workflow', 'testimonials', 'faq', 'cta'].map((section) => (
          <div 
            key={section}
            className={`${styles.navDot} ${activeSection === section ? styles.active : ''}`}
            onClick={() => scrollToSection(section)}
            title={section.charAt(0).toUpperCase() + section.slice(1)}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section id="hero" ref={heroRef} className={`${styles.hero} ${styles.section}`}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>JustSplit</h1>
            <h2 className={styles.heroSubtitle}>Split expenses with friends and family. Track who owes who and settle up easily.</h2>
            <div className={styles.heroCta}>
              <Link href="/auth/register" className={styles.buttonPrimary}>
                Get Started
              </Link>
              <Link href="/about" className={styles.buttonSecondary}>
                Learn More
              </Link>
            </div>
          </div>
          
          <div className={styles.heroImage}>
            <div className={styles.mockupContainer}>
              <div className={styles.mockupHeader}>
                <h3 className={styles.mockupTitle}>Weekend Trip Expenses</h3>
              </div>
              <div className={styles.mockupBody}>
                <div className={styles.mockupExpense}>
                  <div className={styles.mockupExpenseIcon}>🏨</div>
                  <div className={styles.mockupExpenseDetails}>
                    <div>Hotel Stay</div>
                    <div className={styles.mockupExpenseAmount}>$350</div>
                  </div>
                </div>
                <div className={styles.mockupExpense}>
                  <div className={styles.mockupExpenseIcon}>🍽️</div>
                  <div className={styles.mockupExpenseDetails}>
                    <div>Dinner</div>
                    <div className={styles.mockupExpenseAmount}>$125</div>
                  </div>
                </div>
                <div className={styles.mockupExpense}>
                  <div className={styles.mockupExpenseIcon}>⛽</div>
                  <div className={styles.mockupExpenseDetails}>
                    <div>Gas</div>
                    <div className={styles.mockupExpenseAmount}>$60</div>
                  </div>
                </div>
                <div className={styles.mockupSummary}>
                  Andy owes you: $178.33<br />
                  You owe Sarah: $54.16
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.heroWave}>
          <svg className={styles.waveSvg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 140">
            <path 
              fill="#ffffff" 
              fillOpacity="1" 
              d="M0,64L80,85.3C160,107,320,149,480,138.7C640,128,800,64,960,48C1120,32,1280,64,1360,80L1440,96L1440,140L1360,140C1280,140,1120,140,960,140C800,140,640,140,480,140C320,140,160,140,80,140L0,140Z"
            ></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className={`${styles.featuresSection} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Why Choose JustSplit?</h2>
        
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span className={styles.featureEmoji}>📱</span>
              </div>
            </div>
            <h3>Easy to Use</h3>
            <p>Simple, intuitive interface that makes expense tracking and splitting a breeze, even for complex group arrangements.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span className={styles.featureEmoji}>💸</span>
              </div>
            </div>
            <h3>Multiple Currencies</h3>
            <p>Travel internationally? Track expenses in different currencies with automatic conversion to your preferred currency.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span className={styles.featureEmoji}>👨‍👩‍👧‍👦</span>
              </div>
            </div>
            <h3>Group Management</h3>
            <p>Create different groups for roommates, trips, or events. Keep your expenses organized by context.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span className={styles.featureEmoji}>📊</span>
              </div>
            </div>
            <h3>Expense Analytics</h3>
            <p>Visualize spending patterns with intuitive charts to better understand where your money is going.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span className={styles.featureEmoji}>⚖️</span>
              </div>
            </div>
            <h3>Fair Splitting</h3>
            <p>Split expenses equally or by custom amounts. Accommodate different sharing arrangements with flexibility.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span className={styles.featureEmoji}>🔒</span>
              </div>
            </div>
            <h3>Secure & Private</h3>
            <p>Your financial data stays private. We use bank-level security to protect your information.</p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" ref={workflowRef} className={`${styles.workflowSection} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        
        <div className={styles.workflowSteps}>
          <div className={styles.workflowStep}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3>Create a Group or Event</h3>
              <p>Start by creating a group for your roommates, a trip, or even a one-time dinner. Add friends to your expense group.</p>
              
              <div className={styles.stepPlaceholder}>
                <div className={styles.stepPlaceholderText}>
                  <span className={styles.stepPlaceholderIcon}>👥</span>
                  <span>Europe Trip 2025</span>
                </div>
                <div className={styles.stepPlaceholderMembers}>
                  <div className={styles.memberAvatar}>A</div>
                  <div className={styles.memberAvatar}>M</div>
                  <div className={styles.memberAvatar}>S</div>
                  <div className={styles.memberAvatarAdd}>+</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.workflowStep}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3>Add Expenses As They Happen</h3>
              <p>Log expenses with details like amount, category, and who paid. Choose how to split costs - equally or by custom amounts.</p>
              
              <div className={styles.stepPlaceholder}>
                <div className={styles.stepPlaceholderForm}>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Description:</div>
                    <div className={styles.formValue}>Hotel Booking</div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Amount:</div>
                    <div className={styles.formValue}>$450.00</div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Paid by:</div>
                    <div className={styles.formValue}>Alex</div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Split:</div>
                    <div className={styles.formValue}>Equally (3 people)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.workflowStep}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3>See Who Owes Who</h3>
              <p>JustSplit automatically calculates balances and optimizes who pays whom to minimize the number of transactions needed.</p>
              
              <div className={styles.stepPlaceholder}>
                <div className={styles.settlementSummary}>
                  <div className={styles.settlementHeader}>Settlement Summary</div>
                  <div className={styles.settlementRow}>
                    <div>Maria owes Alex:</div>
                    <div className={styles.settlementAmount}>$150.00</div>
                  </div>
                  <div className={styles.settlementRow}>
                    <div>Sam owes Alex:</div>
                    <div className={styles.settlementAmount}>$150.00</div>
                  </div>
                  <div className={styles.settlementButton}>
                    Settle Up
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" ref={testimonialsRef} className={`${styles.testimonialsSection} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>What Our Users Say</h2>
        
        <div className={styles.testimonialsGrid}>
          <div className={styles.testimonialCard}>
            <span className={styles.testimonialQuote}>&quot;</span>
            <p>JustSplit saved our friendship! No more awkward money conversations after group trips. The multi-currency support was perfect for our Europe backpacking adventure.</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>J</div>
              <div>
                <strong>Jessica T.</strong>
                <span>Frequent Traveler</span>
              </div>
            </div>
          </div>
          
          <div className={styles.testimonialCard}>
            <span className={styles.testimonialQuote}>&quot;</span>
            <p>As a finance-conscious roommate in a house of five, I needed something that everyone could use easily. JustSplit is simple enough for my non-tech-savvy roommates but powerful enough for our complex household.</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>M</div>
              <div>
                <strong>Michael R.</strong>
                <span>College Student</span>
              </div>
            </div>
          </div>
          
          <div className={styles.testimonialCard}>
            <span className={styles.testimonialQuote}>&quot;</span>
            <p>I organize family reunions every year, and keeping track of shared expenses used to be a nightmare. JustSplit made it so easy that even my 70-year-old aunt could participate in splitting costs!</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>L</div>
              <div>
                <strong>Liu W.</strong>
                <span>Family Organizer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" ref={faqRef} className={`${styles.faqSection} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        
        <div className={styles.faqContainer}>
          {[
            {
              question: "Is JustSplit free to use?",
              answer: "Yes! JustSplit is completely free for basic expense tracking and splitting. We may offer premium features in the future, but the core functionality will always remain free."
            },
            {
              question: "Can I split expenses unequally?",
              answer: "Absolutely! JustSplit supports multiple split methods: equal splits, percentage-based splits, share-based splits, and exact amount splits. You can even exclude certain people from specific expenses."
            },
            {
              question: "Does JustSplit support multiple currencies?",
              answer: "Yes! You can add expenses in any currency, and JustSplit will convert them to your preferred currency using up-to-date exchange rates. Great for international trips or mixed-currency groups!"
            },
            {
              question: "How does settlement work?",
              answer: "JustSplit calculates the optimal way for people to settle debts with minimal transactions. You'll see exactly who needs to pay whom. You can then mark debts as settled manually after real-world payments occur."
            },
            {
              question: "Can I export my expense data?",
              answer: "Yes, you can export your expense data to CSV files, making it easy to use in spreadsheets or other financial applications."
            }
          ].map((faq, index) => (
            <div key={index} className={styles.faqItem}>
              <button 
                className={`${styles.faqQuestion} ${activeFaq === index ? styles.active : ''}`}
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                {faq.question}
                <span className={styles.faqArrow}>&#9660;</span>
              </button>
              
              {activeFaq === index && (
                <div className={styles.faqAnswer}>
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" ref={ctaRef} className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>Ready to Split Expenses Without the Headache?</h2>
          <p>Join thousands of users who have simplified their shared expenses with JustSplit.</p>
          <Link href="/auth/register" className={styles.ctaButton}>
            Get Started for Free
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
