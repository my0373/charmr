function AboutPage() {
  return (
    <div className="page-about">
      <h1>About Charmr</h1>

      <section className="about-section">
        <h2>What is Charmr?</h2>
        <p>
          Charmr is a free, source-available platform built to help charities of all
          sizes run their organisations more effectively. It handles member
          management, regional event coordination, and the day-to-day admin
          that charity organisers currently juggle across spreadsheets, email
          threads, and paper forms.
        </p>
      </section>

      <section className="about-section">
        <h2>Why was it created?</h2>
        <p>
          Many charities do vital work with limited resources. Off-the-shelf
          software is often too expensive, too generic, or doesn't take the
          security of member data seriously enough.
        </p>
        <p>
          Charmr was created to give these organisations a free tool that
          is purpose-built for their needs — secure by default, easy to use
          on any device, and designed to be run by volunteers, not IT
          departments.
        </p>
      </section>

      <section className="about-section">
        <h2>Members and families</h2>
        <p>
          A membership often represents a whole family — participants alongside
          parents, siblings, carers, and volunteers. Charmr understands this
          structure and lets each family member see what matters to them,
          whether that's schedules, volunteering commitments, or event details.
        </p>
      </section>

      <section className="about-section">
        <h2>Security first</h2>
        <p>
          Charmr is designed to hold personally identifiable information and
          takes security seriously: fine-grained role-based access control,
          audit logging, encryption at rest, and development practices aligned
          with the OWASP Top 10.
        </p>
      </section>
    </div>
  );
}

export default AboutPage;
