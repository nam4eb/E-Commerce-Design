<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderCustomerNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Order $order, public readonly string $event)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)->subject("Đơn hàng {$this->order->number} — Điện Máy 365")
            ->greeting("Xin chào {$this->order->customer_name},")
            ->line($this->event === 'placed' ? 'Đơn hàng của bạn đã được tiếp nhận.' : "Trạng thái đơn hàng hiện tại: {$this->order->status->value}.")
            ->line('Tổng thanh toán: '.number_format((float) $this->order->grand_total, 0, ',', '.').'₫');

        return $message->line('Mã đơn hàng: '.$this->order->number);
    }
}
