// Convert time string to minutes for comparison
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  // Adjust hours to create the desired order: 7am-11pm, then 12am-6am
  let adjustedHours = hours;
  if (hours >= 7) {
    // 7am-11pm stays as is (420-1380 minutes)
    adjustedHours = hours;
  } else {
    // 12am-6am gets pushed to after 11pm (1440-1800 minutes)
    adjustedHours = hours + 24;
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