// Convert time string to minutes for comparison
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  // Adjust hours to create the desired order: 7am-5pm, then 7pm-5am
  let adjustedHours = hours;
  
  if (hours >= 7 && hours <= 17) {
    // Day shift: 7am-5pm stays as is (420-1020 minutes)
    adjustedHours = hours;
  } else if (hours >= 19 || hours <= 5) {
    // Night shift: 7pm-11pm gets 19-23, 12am-5am gets 24-29
    if (hours >= 19) {
      adjustedHours = hours; // 19-23 (7pm-11pm)
    } else {
      adjustedHours = hours + 24; // 0-5 becomes 24-29 (12am-5am)
    }
  } else {
    // 6am and 6pm fall into a gap - put them at the end
    adjustedHours = hours + 30;
  }
  
  return adjustedHours * 60 + minutes;
}

// Sort orders by adjusted time
export function sortOrdersByTime<T extends { time: string }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const minutesA = timeToMinutes(a.time);
    const minutesB = timeToMinutes(b.time);
    return minutesA - minutesB;
  });
}