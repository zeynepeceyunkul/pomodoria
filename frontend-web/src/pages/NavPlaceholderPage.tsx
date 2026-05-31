import styles from './NavPlaceholderPage.module.css';

export function NavPlaceholderPage({ title }: { title: string }) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.sub}>This section will be available soon.</p>
    </div>
  );
}
