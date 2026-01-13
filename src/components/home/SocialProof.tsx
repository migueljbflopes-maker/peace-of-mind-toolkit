import { Quote } from "lucide-react";

const SocialProof = () => {
  const testimonials = [
    {
      quote: "Finally, a preparedness tool that doesn't try to scare me into buying things.",
      author: "Maria S.",
      location: "Lisbon",
    },
    {
      quote: "The supplies checklist saved me hours of research. Everything I needed in one place.",
      author: "Thomas K.",
      location: "Berlin",
    },
    {
      quote: "Having our family plan printed and ready gives us real peace of mind.",
      author: "Anna L.",
      location: "Amsterdam",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Trusted by people who want peace of mind
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 shadow-soft border border-border/50"
            >
              <Quote className="h-8 w-8 text-teal/30 mb-4" />
              <p className="text-foreground mb-4 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="text-sm">
                <span className="font-medium text-foreground">{testimonial.author}</span>
                <span className="text-muted-foreground"> — {testimonial.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
