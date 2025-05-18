'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

import styles from './landing.module.css';

const LandingPage = () => {
  // Tracks which FAQ is open
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // For animated scroll sections - with defaults to ensure visibility
  const features = useAnimation();
  const workflow = useAnimation();
  const testimonials = useAnimation();
  const faq = useAnimation();
  
  // Refs for intersection observer with reduced threshold for better detection
  const [featuresRef, featuresInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [workflowRef, workflowInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [testimonialsRef, testimonialsInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [faqRef, faqInView] = useInView({ threshold: 0.1, triggerOnce: true });
  
  // Animate sections when they come into view
  useEffect(() => {
    if (featuresInView) {
      features.start('visible');
    }
    if (workflowInView) {
      workflow.start('visible');
    }
    if (testimonialsInView) {
      testimonials.start('visible');
    }
    if (faqInView) {
      faq.start('visible');
    }
  }, [featuresInView, workflowInView, testimonialsInView, faqInView, features, workflow, testimonials, faq]);
  
  // Fallback animation to ensure all elements eventually become visible
  useEffect(() => {
    // After page load, ensure all sections become visible after a delay
    const timer = setTimeout(() => {
      features.start('visible');
      workflow.start('visible');
      testimonials.start('visible');
      faq.start('visible');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [features, workflow, testimonials, faq]);
  
  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };
  
  const staggerChildren = {
    hidden: { opacity: 1 }, // Start with container visible
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      }
    }
  };
  
  // Add section refs for navigation dots
  const heroRef = useRef(null);
  const featuresRef2 = useRef(null);
  const workflowRef2 = useRef(null);
  const testimonialsRef2 = useRef(null);
  const faqRef2 = useRef(null);
  const ctaRef = useRef(null);
  
  // State for active section (for navigation dots)
  const [activeSection, setActiveSection] = useState('hero');
  
  // Check which section is in view for navigation dots
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6, // Higher threshold to ensure section is mostly in view
    };
    
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);
    
    // Observe all section elements
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
      sectionObserver.observe(section);
    });
    
    return () => {
      sections.forEach(section => {
        sectionObserver.unobserve(section);
      });
    };
  }, []);

  // Function to scroll to section when nav dot is clicked
  const scrollToSection = (id) => {
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
          <motion.div 
            className={styles.heroText}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className={styles.heroTitle}>JustSplit</h1>
            <p className={styles.heroSubtitle}>
              The simplest way to split expenses with friends, roommates, and groups
            </p>
            
            <motion.div 
              className={styles.heroCta}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Link href="/auth/signin" className={styles.buttonSecondary}>Log In</Link>
              <Link href="/auth/signup" className={styles.buttonPrimary}>Sign Up Free</Link>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className={styles.heroImage}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Using a styled div instead of an image */}
            <div className={styles.mockupContainer}>
              <div className={styles.mockupHeader}>
                <div className={styles.mockupTitle}>Vacation Expenses</div>
              </div>
              <div className={styles.mockupBody}>
                <div className={styles.mockupExpense}>
                  <div className={styles.mockupExpenseIcon}>🍽️</div>
                  <div className={styles.mockupExpenseDetails}>
                    <div>Dinner at Oceanview</div>
                    <div className={styles.mockupExpenseAmount}>$120.00</div>
                  </div>
                </div>
                <div className={styles.mockupExpense}>
                  <div className={styles.mockupExpenseIcon}>🏨</div>
                  <div className={styles.mockupExpenseDetails}>
                    <div>Hotel Room</div>
                    <div className={styles.mockupExpenseAmount}>$280.00</div>
                  </div>
                </div>
                <div className={styles.mockupSummary}>
                  <div>You owe Alex: $85.00</div>
                  <div>Maya owes you: $45.00</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className={styles.heroWave}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none" className={styles.waveSvg}>
            <path fill="#F5F7FA" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,149.3C960,160,1056,160,1152,138.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </section>

      {/* Why use JustSplit Section */}
      <motion.section 
        id="features"
        ref={featuresRef}
        className={`${styles.featuresSection} ${styles.section}`}
        animate={features}
        initial="hidden"
        variants={staggerChildren}
      >
        <motion.h2 
          className={styles.sectionTitle}
          variants={fadeInUp}
          // Add fallback animation in case parent animation fails
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Why use JustSplit?
        </motion.h2>
        
        <div className={styles.featuresGrid}>
          <motion.div 
            className={styles.featureCard}
            variants={fadeInUp}
            // Add fallback animation in case parent animation fails
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span role="img" aria-label="Track Expenses" className={styles.featureEmoji}>📝</span>
              </div>
            </div>
            <h3>Track Expenses Easily</h3>
            <p>Add expenses on the go and let JustSplit calculate who owes what.</p>
          </motion.div>
          
          <motion.div 
            className={styles.featureCard}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span role="img" aria-label="Split Multiple Ways" className={styles.featureEmoji}>🔄</span>
              </div>
            </div>
            <h3>Split Multiple Ways</h3>
            <p>Split bills equally, by percentages, or by specific amounts.</p>
          </motion.div>
          
          <motion.div 
            className={styles.featureCard}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.featureIcon}>
              <div className={styles.emojiContainer}>
                <span role="img" aria-label="Settle Up" className={styles.featureEmoji}>✅</span>
              </div>
            </div>
            <h3>Settle Up</h3>
            <p>See balances at a glance and settle debts with just a few clicks.</p>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section 
        id="workflow"
        ref={workflowRef}
        className={`${styles.workflowSection} ${styles.section}`}
        animate={workflow}
        initial="hidden"
        variants={staggerChildren}
      >
        <motion.h2 
          className={styles.sectionTitle}
          variants={fadeInUp}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          How JustSplit Works
        </motion.h2>
        
        <div className={styles.workflowSteps}>
          <motion.div 
            className={styles.workflowStep}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3>Create a Group</h3>
              <p>Start with a group for your roommates, trip, or any shared expenses.</p>
              <div className={styles.stepPlaceholder}>
                <div className={styles.stepPlaceholderText}>
                  <span className={styles.stepPlaceholderIcon}>👨‍👩‍👧‍👦</span>
                  <span>New Beach Trip Group</span>
                </div>
                <div className={styles.stepPlaceholderMembers}>
                  <div className={styles.memberAvatar}>JD</div>
                  <div className={styles.memberAvatar}>AM</div>
                  <div className={styles.memberAvatar}>SK</div>
                  <div className={styles.memberAvatarAdd}>+</div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className={styles.workflowStep}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3>Add Expenses</h3>
              <p>Log expenses as they happen and assign them to group members.</p>
              <div className={styles.stepPlaceholder}>
                <div className={styles.stepPlaceholderForm}>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Description:</div>
                    <div className={styles.formValue}>Beachside Dinner</div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Amount:</div>
                    <div className={styles.formValue}>$86.50</div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Paid by:</div>
                    <div className={styles.formValue}>You</div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Split with:</div>
                    <div className={styles.formValue}>Everyone equally</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className={styles.workflowStep}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3>Settle Debts</h3>
              <p>See who owes what and settle up with minimal transactions.</p>
              <div className={styles.stepPlaceholder}>
                <div className={styles.settlementSummary}>
                  <div className={styles.settlementHeader}>Balances</div>
                  <div className={styles.settlementRow}>
                    <div className={styles.settlementName}>Alex M.</div>
                    <div className={styles.settlementAmount}>owes you $42.25</div>
                  </div>
                  <div className={styles.settlementRow}>
                    <div className={styles.settlementName}>Sarah K.</div>
                    <div className={styles.settlementAmount}>owes you $29.00</div>
                  </div>
                  <div className={styles.settlementButton}>Settle Up</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section 
        id="testimonials"
        ref={testimonialsRef}
        className={`${styles.testimonialsSection} ${styles.section}`}
        animate={testimonials}
        initial="hidden"
        variants={staggerChildren}
      >
        <motion.h2 
          className={styles.sectionTitle}
          variants={fadeInUp}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          What Our Users Say
        </motion.h2>
        
        <div className={styles.testimonialsGrid}>
          <motion.div 
            className={styles.testimonialCard}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.testimonialQuote}>"</div>
            <p>JustSplit made our vacation so much easier! No more awkward conversations about who owes what.</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>
                <span>JM</span>
              </div>
              <div>
                <strong>Jamie M.</strong>
                <span>Group Trip Organizer</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className={styles.testimonialCard}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.testimonialQuote}>"</div>
            <p>As roommates, we use JustSplit daily. It's simplified our shared expenses and eliminated conflicts.</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>
                <span>SR</span>
              </div>
              <div>
                <strong>Sarah R.</strong>
                <span>Apartment Dweller</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className={styles.testimonialCard}
            variants={fadeInUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.testimonialQuote}>"</div>
            <p>The multiple split options are fantastic! Perfect for when we need to divide bills in different ways.</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>
                <span>DK</span>
              </div>
              <div>
                <strong>David K.</strong>
                <span>Friend Group Treasurer</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section 
        id="faq"
        ref={faqRef}
        className={`${styles.faqSection} ${styles.section}`}
        animate={faq}
        initial="visible" // Start visible to ensure content shows
      >
        <motion.h2 
          className={styles.sectionTitle}
          variants={fadeInUp}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Frequently Asked Questions
        </motion.h2>
        
        <div className={styles.faqContainer}>
          {[
            {
              question: "Is JustSplit free to use?",
              answer: "Yes! JustSplit is completely free for basic expense splitting. We offer premium features for power users who need advanced reporting and integrations."
            },
            {
              question: "How do I add friends to split expenses with?",
              answer: "You can invite friends via email or by sharing a unique link. Once they join, you can add them to your groups or directly split expenses with them."
            },
            {
              question: "Can I split expenses unequally?",
              answer: "Absolutely! JustSplit allows you to split expenses equally, by percentages, by shares, or by exact amounts. Perfect for any situation where costs aren't divided evenly."
            },
            {
              question: "Does JustSplit handle different currencies?",
              answer: "Yes, JustSplit supports multiple currencies, making it perfect for international trips or friends living in different countries."
            },
            {
              question: "How secure is my financial information?",
              answer: "Very secure. JustSplit uses bank-level encryption and never stores your actual payment details. We only track what you tell us about your expenses and balances."
            }
          ].map((faq, index) => (
            <motion.div 
              key={index} 
              className={`${styles.faqItem} ${activeFaq === index ? styles.active : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <button 
                className={styles.faqQuestion} 
                onClick={() => toggleFaq(index)}
                aria-expanded={activeFaq === index}
              >
                {faq.question}
                <span className={styles.faqArrow}>
                  {activeFaq === index ? '−' : '+'}
                </span>
              </button>
              {activeFaq === index && (
                <motion.div 
                  className={styles.faqAnswer}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p>{faq.answer}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Final CTA Section */}
      <motion.section 
        id="cta"
        className={`${styles.ctaSection} ${styles.section}`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.ctaContent}>
          <h2>Ready to simplify expense sharing?</h2>
          <p>Join thousands of users who trust JustSplit for hassle-free splits.</p>
          <Link href="/auth/signup" className={styles.ctaButton}>
            Get Started Now
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default LandingPage;
