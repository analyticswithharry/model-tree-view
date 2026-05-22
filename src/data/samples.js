export const SAMPLE_SNIPPETS = [
  {
    id: "profile-card",
    label: "Profile card",
    description: "A tiny real-world card with text, links, and a button.",
    html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Profile Card</title>
  </head>
  <body>
    <main class="page-shell">
      <section class="profile-card">
        <img src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300" alt="Profile avatar" />
        <h1>Ada Lovelace</h1>
        <p class="role">First programmer, mathematical thinker, and curiosity engine.</p>
        <div class="actions">
          <a href="https://en.wikipedia.org/wiki/Ada_Lovelace">Read bio</a>
          <button type="button">Follow</button>
        </div>
      </section>
    </main>
  </body>
</html>`,
  },
  {
    id: "semantic-layout",
    label: "Semantic layout",
    description:
      "Shows how header, nav, article, section, and footer nest together.",
    html: `<!DOCTYPE html>
<html>
  <body>
    <header>
      <h1>Learning the DOM</h1>
      <nav>
        <a href="#intro">Intro</a>
        <a href="#practice">Practice</a>
      </nav>
    </header>

    <main>
      <article id="intro">
        <h2>Why structure matters</h2>
        <p>The browser turns HTML into a tree of nodes.</p>
      </article>

      <section id="practice">
        <h2>Try it yourself</h2>
        <ul>
          <li>Open DevTools</li>
          <li>Inspect the DOM</li>
          <li>Compare tags and nesting</li>
        </ul>
      </section>
    </main>

    <footer>
      <small>Built for practice.</small>
    </footer>
  </body>
</html>`,
  },
  {
    id: "form-playground",
    label: "Form playground",
    description:
      "Useful for seeing attributes, labels, and nested form controls.",
    html: `<!DOCTYPE html>
<html>
  <body>
    <form class="signup-form">
      <label>
        Email
        <input type="email" name="email" placeholder="you@example.com" />
      </label>

      <label>
        Favourite topic
        <select name="topic">
          <option>DOM</option>
          <option>Events</option>
          <option>React</option>
        </select>
      </label>

      <!-- Helpful learning comment -->
      <button type="submit">Join the workshop</button>
    </form>
  </body>
</html>`,
  },
];
