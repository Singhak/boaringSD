import { permanentRedirect } from "next/navigation";

// The Evolution slideshow became the playable Scale Journey.
export default function EvolutionPage() {
  permanentRedirect("/journey");
}
