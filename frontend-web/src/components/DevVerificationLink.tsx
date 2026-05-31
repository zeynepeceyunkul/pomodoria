import styles from './DevVerificationLink.module.css';

export function DevVerificationLink({ url }: { url: string }) {
  return (
    <div className={styles.box} role="region" aria-label="Development verification link">
      <p className={styles.title}>Development mode — no real email was sent</p>
      <p className={styles.hint}>
        SMTP is not configured on the server. Open this link to verify your account:
      </p>
      <a className={styles.link} href={url}>
        {url}
      </a>
    </div>
  );
}
