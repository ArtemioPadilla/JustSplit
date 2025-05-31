import Hero from '../components/Home/Hero';
import Features from '../components/Home/Features';
import MissionSection from '../components/Home/MissionSection';
import SolutionsPreview from '../components/Home/SolutionsPreview';
import CallToAction from '../components/Home/CallToAction';

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <MissionSection />
      <SolutionsPreview />
      <CallToAction />
    </>
  );
}