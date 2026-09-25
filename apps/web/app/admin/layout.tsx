import ReservationAlertProvider from "../../components/ReservationAlertProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ReservationAlertProvider />
      {children}
    </>
  );
}
