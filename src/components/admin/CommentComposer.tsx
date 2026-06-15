import { Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

type CommentComposerProps = {
  placeholder?: string;
  onSubmit: (comment: string) => Promise<void> | void;
};

export function CommentComposer({ placeholder = 'Escreva um comentário...', onSubmit }: CommentComposerProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const value = comment.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      await onSubmit(value);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Textarea
        aria-label="Novo comentário"
        rows={3}
        placeholder={placeholder}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <Button className="justify-self-end" size="sm" disabled={!comment.trim() || submitting} onClick={handleSubmit}>
        <Send size={15} />
        Comentar
      </Button>
    </div>
  );
}
