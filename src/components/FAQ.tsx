import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "Does Resilient.app work offline?",
      answer:
        "Yes! Resilient.app is built as a Progressive Web App (PWA), which means you can install it on your device and access all core features even without an internet connection. Your risk assessment, supplies list, and library content are all available offline.",
    },
    {
      question: "Do I need to create an account?",
      answer:
        "No account is required to use our core free features: risk calculator, supplies planner, library, tips, and weekly briefings. You only need to log in if you want to save your progress, sync across devices, or access Premium features.",
    },
    {
      question: "What is the Red Folder PDF?",
      answer:
        "The Red Folder is a Premium feature that generates a comprehensive PDF containing all your critical emergency information: contact numbers, meeting points, evacuation routes, important documents, and more. It's designed to be printed and stored for offline access during emergencies.",
    },
    {
      question: "How is my data secured?",
      answer:
        "All sensitive data in Premium features (Vault, backup/restore) is encrypted end-to-end. Your documents and personal information are encrypted before leaving your device, meaning only you can access them. We follow industry best practices for data security.",
    },
    {
      question: "Is Premium a subscription?",
      answer:
        "No subscriptions! Premium is a one-time payment of €49. You get lifetime access to all Premium features including future updates. We believe emergency preparedness shouldn't come with recurring fees.",
    },
    {
      question: "Which countries and languages are supported?",
      answer:
        "Resilient.app is currently available in English with guidance relevant to European countries. We're working on adding more languages and country-specific recommendations. The core preparedness principles apply universally, though we always recommend following your local authorities' guidance.",
    },
  ];

  return (
    <section id="faq" className="bg-section py-16 sm:py-20">
      <div className="container-narrow section-padding">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Resilient.app
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b border-border/50">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
