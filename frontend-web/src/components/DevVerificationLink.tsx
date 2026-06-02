import styles from './DevVerificationLink.module.css';

export function DevVerificationLink({
  url,
  label = 'Development mode — no real email was sent',
  hint = 'SMTP is not configured on the server. Open this link:',
}: {
  url: string;
  label?: string;
  hint?: string;
}) {
  return (
    <div className={styles.box} role="region" aria-label="Development link">
      <p className={styles.title}>{label}</p>
      <p className={styles.hint}>{hint}</p>
      <a className={styles.link} href={url}>
        {url}
      </a>
    </div>
  );
}
