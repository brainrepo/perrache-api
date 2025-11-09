# Total cost of reusability


  Reusing an API provides the immediate benefit of reducing development effort. Over the long term,
  however, as the requirements of its consumers diverge, the shared API will be pressured to support a
  growing list of new features. This inevitably causes maintenance costs to skyrocket (coordination cost).

  When promoting reuse, it is crucial to consider these future costs by forecasting the API's likely
  evolution. The API must be kept as lean as possible, strictly avoiding any application-specific or
  workflow-specific logic. The ideal approach is to adopt the Unix philosophy: create small, focused
  tools that can be composed to build more complex processes. These resulting applications are
  purpose-built and not shared, which preserves the maintainability of the core components.

## Calculate total cost of reusability over time

Total Cost of Reuse (TCR) = (Long-Term Costs) - (Initial Savings)

A positive TCR means the reuse was costly. A negative TCR means it was beneficial.


### Part 1: Calculate Initial Savings (The Obvious Benefit)

This is the easy part that everyone focuses on.

Initial Savings = (A) - (B)

  * (A) Cost of Building New:
      * Development Time: Hours/cost to design, code, and unit test a new, purpose-built component.
      * Testing Time: Hours/cost for dedicated QA and integration testing.
      * Documentation Time: Hours/cost to document the new component.

  * (B) Cost of Integration:
      * Discovery & Learning: Time spent by the new team to find, understand, and learn the reusable
        API.
      * Integration Work: Time spent writing the "glue code" to make the shared API work in the new
        context.
      * Compromise Cost: Time spent building workarounds for features the shared API doesn't quite
        support.

Initial Savings are almost always positive, which is why reuse is so tempting.

### Part 2: Calculate Long-Term Costs (The Hidden Tax)

This is the crucial part that is often ignored. These costs are paid continuously over the
component's lifecycle.

Long-Term Costs = (C) + (D) + (E)

  * (C) Governance & Maintenance Cost:
      * Coordination Overhead: The time spent in meetings, emails, and chats between the API owner and
        all consumer teams to negotiate changes, prioritize backlogs, and manage breaking changes. This
        is the single biggest hidden cost.
      * Higher Testing Burden: The cost of extensive regression testing. A small change for one consumer
        requires re-testing for all consumers to ensure nothing breaks. The test matrix complexity grows
        exponentially with each new consumer.
      * Support & Documentation: The time the API team spends supporting multiple consumer teams and
        maintaining documentation for a diverse audience.

  * (D) Coupling & Agility Cost:
      * Cost of Delay: When a team is blocked waiting for a change in the shared API, calculate the
        value of the delayed feature per week. (Value of Delayed Feature) x (Weeks Delayed). This
        represents lost revenue or opportunity.
      * Cost of Compromise: The business cost of shipping a suboptimal user experience because the
        shared API couldn't support the ideal design. This can be measured in lower conversion rates,
        engagement, or customer satisfaction.
      * Deployment Risk: The cost associated with the higher risk of a single deployment breaking
        multiple applications simultaneously (the "blast radius").

  * (E) Performance & Bloat Cost:
      * Unused Feature Bloat: A shared API often contains logic for many consumers. Every application
        pays the performance price (CPU, memory, latency) for features it doesn't even use.
      * Lowest Common Denominator: The API is often optimized for a generic use case, meaning it may not
        be performant for a specific, high-demand consumer.

### How to Make a Decision

Before deciding to reuse an API, create a simple scorecard:

  1. Volatility Score (1-5): How likely is the business domain to change? (1 = very stable, like a
    country code list; 5 = very volatile, like a promotional engine).
  2. Consumer Divergence Score (1-5): How different are the needs of the consumers? (1 = nearly
    identical; 5 = completely different business units).
  3. Number of Consumers: How many teams will use this?

Decision Rule:
  * If Volatility or Divergence is high (4-5), the long-term costs will almost certainly outweigh the
    initial savings. Do not share the implementation. Share knowledge and patterns, but let teams build
    their own.
  * If Volatility and Divergence are low (1-2) and the number of consumers is manageable, reuse is a
    strong candidate. This is the sweet spot for shared libraries and services.
