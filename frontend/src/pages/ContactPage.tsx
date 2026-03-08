function ContactPage() {
  return (
    <div className="page-contact">
      <h1>Contact</h1>

      <section className="contact-section">
        <h2>Get in touch</h2>
        <p>
          If you have questions about Charmr or would like to get involved,
          we'd love to hear from you.
        </p>
      </section>

      <div className="contact-grid">
        <div className="card">
          <h3>General enquiries</h3>
          <p>
            For questions about the platform or how it can help your charity,
            please reach out via the project's GitHub page.
          </p>
        </div>

        <div className="card">
          <h3>Report a security issue</h3>
          <p>
            If you've found a security vulnerability, please report it
            responsibly by emailing the maintainers directly rather than opening
            a public issue.
          </p>
        </div>

        <div className="card">
          <h3>Contribute</h3>
          <p>
            Charmr is source-available and free for charities. Whether
            you're a developer, designer, or charity organiser with ideas,
            contributions are welcome on{" "}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
