import { BookingModal } from '../components/booking/BookingModal';
import { SeatMap } from '../components/seats/SeatMap';

export function HomePage() {
  return (
    <>
      <SeatMap />
      <BookingModal />
    </>
  );
}
