import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { CvTemplate } from "../api/types";
import { Badge } from "../components/ui/Badge";
import { Button, buttonVariants } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";

const TEMPLATE_LABELS: Record<CvTemplate, string> = {
  lebenslauf: "Lebenslauf (DE)",
  ats: "ATS (EN)",
};

export default function CvList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<CvTemplate>("lebenslauf");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cvs"] });
  const add = useMutation({
    mutationFn: () => api.addCv({ title: title.trim(), template }),
    onSuccess: ({ cv }) => {
      invalidate();
      navigate(`/cv/${cv.id}`);
    },
  });
  const duplicate = useMutation({ mutationFn: api.duplicateCv, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.deleteCv, onSuccess: invalidate });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
        </div>
      </div>
    );
  }
  const cvs = data?.cvs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">CVs</h1>
        <p className="text-sm text-ink-600">
          Tailor a Lebenslauf per Betrieb — and keep an ATS-friendly English version alongside.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add.mutate();
        }}
      >
        <Input
          className="min-w-56 flex-1"
          placeholder='New CV title, e.g. "Lebenslauf — Pflege"'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select value={template} onChange={(e) => setTemplate(e.target.value as CvTemplate)}>
          {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button disabled={!title.trim() || add.isPending} loading={add.isPending}>
          Create
        </Button>
      </form>

      {cvs.length === 0 && (
        <EmptyState icon={FileText} title="No CVs yet" description="Create your first Lebenslauf above." />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cvs.map((cv) => (
          <Card key={cv.id} interactive>
            <div className="flex items-start justify-between gap-2">
              <Link to={`/cv/${cv.id}`} className="font-medium hover:text-brand-700">
                {cv.title}
              </Link>
              <Badge variant="brand">{TEMPLATE_LABELS[cv.template]}</Badge>
            </div>
            <p className="mt-1 text-xs text-ink-400">updated {new Date(cv.updatedAt).toLocaleDateString()}</p>
            <div className="mt-3 flex gap-2">
              <Link to={`/cv/${cv.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Edit
              </Link>
              <Button variant="outline" size="sm" onClick={() => duplicate.mutate(cv.id)}>
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-danger-600 hover:border-danger-100 hover:bg-danger-50"
                leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
                onClick={() => {
                  if (confirm(`Delete "${cv.title}"?`)) remove.mutate(cv.id);
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
