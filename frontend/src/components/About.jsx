import React from "react";
import { Sprout, AlertTriangle, Cpu, TrendingUp, HelpCircle } from "lucide-react";

export default function About() {
  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#020d08] via-[#051a0e] to-[#071f10] border border-cs-border/40 p-6 md:p-10 shadow-glow">
        <div className="absolute w-[500px] h-[500px] -top-[250px] -right-[150px] rounded-full bg-radial from-cs-jade/12 to-transparent pointer-events-none blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-cs-emerald/25 border border-cs-mint/45 text-cs-mint text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            🌿 About the Platform
          </div>
          <h1 className="text-3xl md:text-5xl font-clash font-bold text-cs-white tracking-tight leading-tight mb-4">
            Intelligence at the root <br />
            of every harvest.
          </h1>
          <p className="text-cs-muted text-sm md:text-base leading-relaxed">
            CropSense AI combines a convolutional neural network (CNN) trained on over 87,000+ plant leaf images with Google's cloud-based Gemini Vision AI. This hybrid integration enables immediate local analysis of 38 standard crop disease classes, while leveraging generative intelligence to identify and diagnose any crop, disease, or pest outbreak on the fly.
          </p>
        </div>
      </div>

      {/* Grid: Problem & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Problem Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-glow relative overflow-hidden">
          <div className="flex items-center gap-3 text-red-400 font-clash font-semibold text-lg mb-3">
            <AlertTriangle className="w-5 h-5" />
            <span>Problem Statement</span>
          </div>
          <p className="text-cs-muted text-sm leading-relaxed">
            Plant diseases threaten global food security, causing up to 40% of crop yield losses annually. Smallholder farmers often lack access to timely, professional agricultural consulting, leading to misdiagnosed foliar diseases and incorrect chemical application. These delays degrade soils, poison water runoff, and lead to massive financial losses for growers.
          </p>
        </div>

        {/* Solution Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-glow relative overflow-hidden">
          <div className="flex items-center gap-3 text-cs-mint font-clash font-semibold text-lg mb-3">
            <Sprout className="w-5 h-5" />
            <span>The CropSense AI Solution</span>
          </div>
          <p className="text-cs-muted text-sm leading-relaxed">
            Our platform provides a zero-latency crop diagnosis pipeline. Using lightweight machine learning at the edge and cloud-based vision processing, CropSense checks leaf structure and flags symptoms instantly. Integrated micro-climate risk profiles, NPK fertilizer advice, chemical/organic treatment steps, and multilingual alerts empower farmers to apply precision treatment.
          </p>
        </div>

      </div>

      {/* Grid: Workflow & Future Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Workflow */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-glow relative overflow-hidden">
          <div className="flex items-center gap-3 text-sky-400 font-clash font-semibold text-lg mb-3">
            <Cpu className="w-5 h-5" />
            <span>Platform Workflow</span>
          </div>
          <ul className="text-cs-muted text-sm space-y-2 leading-relaxed list-inside list-disc">
            <li><b className="text-cs-white">1. Capture:</b> Farmers capture a leaf photo via web camera or file upload.</li>
            <li><b className="text-cs-white">2. Validate:</b> The system runs ImageNet classifiers and face detectors to filter invalid uploads.</li>
            <li><b className="text-cs-white">3. Diagnose:</b> Local CNNs predict standard classes while Gemini performs deep botanic analysis.</li>
            <li><b className="text-cs-white">4. Advice:</b> Custom PDF reports, audio guides, and localized weather advisories are compiled and translated on the fly.</li>
          </ul>
        </div>

        {/* Future Scope */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-glow relative overflow-hidden">
          <div className="flex items-center gap-3 text-purple-400 font-clash font-semibold text-lg mb-3">
            <TrendingUp className="w-5 h-5" />
            <span>Future Scope</span>
          </div>
          <p className="text-cs-muted text-sm leading-relaxed">
            We are working to integrate SMS routing for feature-phones in offline regions, IoT telemetry probes to measure soil nitrogen and soil moisture, and drone-based multispectral scanning to map disease propagation across large fields automatically.
          </p>
        </div>

      </div>

      {/* Tech Stack Details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-glow">
        <h3 className="font-clash font-semibold text-lg text-cs-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cs-mint" />
          Technical Stack & Neural Architecture
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-cs-deep border border-cs-border/40 p-4 rounded-xl">
            <p className="text-cs-mint font-bold text-lg">FastAPI</p>
            <p className="text-[10px] text-cs-muted mt-1 uppercase">Backend API</p>
          </div>
          <div className="bg-cs-deep border border-cs-border/40 p-4 rounded-xl">
            <p className="text-cs-mint font-bold text-lg">TensorFlow</p>
            <p className="text-[10px] text-cs-muted mt-1 uppercase">CNN Inference</p>
          </div>
          <div className="bg-cs-deep border border-cs-border/40 p-4 rounded-xl">
            <p className="text-cs-mint font-bold text-lg">Vite + React</p>
            <p className="text-[10px] text-cs-muted mt-1 uppercase">Frontend SPA</p>
          </div>
          <div className="bg-cs-deep border border-cs-border/40 p-4 rounded-xl">
            <p className="text-cs-mint font-bold text-lg">Gemini 2.5</p>
            <p className="text-[10px] text-cs-muted mt-1 uppercase">Vision & Chat AI</p>
          </div>
        </div>
      </div>

    </div>
  );
}
