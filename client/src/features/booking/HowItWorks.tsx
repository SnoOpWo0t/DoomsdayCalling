import { Clapperboard, Ticket, Users } from 'lucide-react';
import styles from './HowItWorks.module.css';

const STEPS = [
  {
    icon: Clapperboard,
    title: 'Pick a cinema',
    text: 'For opening night, cinemas sell seats only in fixed bundles, for example packs of 6, 9 or 20 seats. You can buy as many of each as you like.',
  },
  {
    icon: Users,
    title: 'Say how many are coming',
    text: 'We find the fewest bundles that add up to exactly your group, so nobody pays for an empty seat.',
  },
  {
    icon: Ticket,
    title: 'Reserve',
    text: 'Save it under a name and get a booking reference for the night.',
  },
];

/** Three-step explanation so the page makes sense at a glance. */
export function HowItWorks() {
  return (
    <ol className={styles.steps} aria-label="How booking works">
      {STEPS.map(({ icon: Icon, title, text }, index) => (
        <li key={title} className={styles.step}>
          <span className={styles.icon}>
            <Icon size={18} aria-hidden />
          </span>
          <div>
            <p className={styles.title}>
              <span className={styles.number}>{index + 1}</span>
              {title}
            </p>
            <p className={styles.text}>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
