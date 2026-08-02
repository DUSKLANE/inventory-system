"use client";

import { useEffect, useState, useRef } from "react";
import { Clock, Filter, Trash2, Edit, Plus } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { PageHeader, EmptyState, Pagination, SelectField } from "@/components/ui";

interface OperationLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details: string;
  operator: string;
  createdAt: string;
}

interface LogsResponse {
  logs: OperationLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const requestSeq = useRef(0);

  const fetchLogs = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    try {
      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      if (seq === requestSeq.current) setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, entityType, action]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "UPDATE":
        return <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "DELETE":
        return <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600 dark:text-[var(--foreground-muted)]" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
      case "UPDATE":
        return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "DELETE":
        return "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-50 dark:bg-[var(--background-subtle)] text-gray-700 dark:text-[var(--foreground-muted)]";
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case "PART":
        return "器件";
      case "MOVEMENT":
        return "出入库";
      case "BOM":
        return "BOM";
      default:
        return type;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin" />
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-[var(--foreground-subtle)] text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: "操作日志" }]} />}
        title="操作日志"
        subtitle="系统操作记录"
      />

      {/* Filters */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] p-6 section shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-52">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] pointer-events-none z-10" />
            <SelectField
              className="pl-9"
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            >
              <option value="">全部类型</option>
              <option value="PART">器件</option>
              <option value="MOVEMENT">出入库</option>
              <option value="BOM">BOM</option>
            </SelectField>
          </div>
          <div className="relative w-52">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[var(--foreground-subtle)] pointer-events-none z-10" />
            <SelectField
              className="pl-9"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
            >
              <option value="">全部操作</option>
              <option value="CREATE">创建</option>
              <option value="UPDATE">更新</option>
              <option value="DELETE">删除</option>
            </SelectField>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl border border-gray-200/80 dark:border-[var(--card-border)] overflow-hidden section shadow-sm">
        {!data || data.logs.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-7 h-7 text-[var(--foreground-subtle)]" />}
            title="暂无操作日志"
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[var(--card-border)]">
            {data.logs.map((log) => (
              <div key={log.id} className="px-8 py-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActionColor(log.action)}`}>
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action === "CREATE" ? "创建" : log.action === "UPDATE" ? "更新" : "删除"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">
                      {getEntityTypeLabel(log.entityType)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-[var(--card-foreground)]">{log.details}</p>
                  {log.entityName && (
                    <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">关联: {log.entityName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-[var(--foreground-subtle)]">
                    {new Date(log.createdAt).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[var(--foreground-subtle)] mt-1">{log.operator}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}
