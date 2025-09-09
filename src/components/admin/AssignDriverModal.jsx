import { useState } from "react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Button";
export default function AssignDriverModal({ order, onSave, onClose }) {
  const [email, setEmail] = useState("");
  return (
    <Modal title={`Assign driver — Order #${order.id}`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
               <Button onClick={()=>onSave(order,email.trim())}>Save</Button></>}>
      <input className="w-full border rounded px-3 py-2" placeholder="driver@email.com"
             value={email} onChange={e=>setEmail(e.target.value)} />
      <p className="text-xs text-gray-600 mt-2">Enter the driver’s account email.</p>
    </Modal>
  );
}
