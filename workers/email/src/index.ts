const GUIDO = "guido.tack@monash.edu";
const ZAYENZ = "zayenz@gmail.com";

const toGuido = new Set(["tack"]);
const toZayenz = new Set(["lagerkvist", "zayenz"]);
const toBoth = new Set(["info", "schulte", "chschulte"]);

export function destinationsFor(recipient: string): readonly string[] {
  const [local, domain, extra] = recipient.trim().toLowerCase().split("@");
  if (!local || domain !== "gecode.dev" || extra) return [];
  if (toGuido.has(local)) return [GUIDO];
  if (toZayenz.has(local)) return [ZAYENZ];
  if (toBoth.has(local)) return [GUIDO, ZAYENZ];
  return [ZAYENZ];
}

export async function routeEmail(message: ForwardableEmailMessage): Promise<void> {
  const destinations = destinationsFor(message.to);
  if (destinations.length === 0) {
    message.setReject("Unknown Gecode mail domain");
    return;
  }
  const results = await Promise.allSettled(destinations.map((destination) => message.forward(destination)));
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map((failure) => failure.reason), "Email forwarding failed");
}

export default {
  email: routeEmail,
} satisfies ExportedHandler;
