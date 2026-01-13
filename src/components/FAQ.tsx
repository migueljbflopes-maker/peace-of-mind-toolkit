import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "Do I need an account?",
      answer:
        "No! You can use all our core features (risk calculator, supplies planner, library, tips) without creating an account. An account is only needed if you want to save your progress, sync across devices, or access Premium features.",
    },
    {
      question: "Does it work offline?",
      answer:
        "Yes! The app is built as a Progressive Web App (PWA) and works offline. Your risk assessment, supplies list, and library content are all available even without an internet connection.",
    },
    {
      question: "Is my data safe?",
      answer:
        "All sensitive data in Premium features (Vault, backup/restore) is encrypted end-to-end. Your documents and personal information are encrypted before leaving your device, meaning only you can access them. We never store plaintext data.",
    },
    {
      question: "Is Premium a subscription?",
      answer:
        "No subscriptions! Premium is a one-time payment of €49. You get lifetime access to all Premium features including future updates. We believe emergency preparedness shouldn't come with recurring fees.",
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
