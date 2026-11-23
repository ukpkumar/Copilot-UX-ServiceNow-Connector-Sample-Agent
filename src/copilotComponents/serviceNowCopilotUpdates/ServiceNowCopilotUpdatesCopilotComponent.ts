import {
  BaseCopilotComponent,
  createCopilotTextContent
} from '@microsoft/sp-copilot-component';
import { escape } from '@microsoft/sp-lodash-subset';

import sampleUpdates from '../../data/copilotUpdates.sample.json';
import {
  serviceNowUpdateRecordSchema,
  type IServiceNowCopilotUpdatesCopilotComponentProperties,
  type IServiceNowUpdateRecord
} from './ServiceNowCopilotUpdatesCopilotComponentProperties';

import styles from './ServiceNowCopilotUpdatesCopilotComponent.module.scss';

const EXPAND_ICON: string = '⛶';
const ALL: string = 'All';
const DEFAULT_WINDOW_DAYS: number = 30;

const SAMPLE_RECORDS: IServiceNowUpdateRecord[] = sampleUpdates.map((record: unknown) =>
  serviceNowUpdateRecordSchema.parse(record)
);

interface IStatusCount {
  label: IServiceNowUpdateRecord['status'];
  count: number;
}

type FollowUpState = 'idle' | 'sending' | 'sent' | 'error';

export default class ServiceNowCopilotUpdatesCopilotComponent extends BaseCopilotComponent<IServiceNowCopilotUpdatesCopilotComponentProperties> {
  private _productFilter: string = ALL;
  private _statusFilter: string = ALL;
  private _timeWindowDays: number = DEFAULT_WINDOW_DAYS;
  private _searchText: string = '';
  private _selectedSysId: string | undefined;
  private _filtersInitialized: boolean = false;
  private _followUpState: FollowUpState = 'idle';

  protected render(): void {
    this._initializeState();

    const records: IServiceNowUpdateRecord[] = this._getRecords();
    const filteredRecords: IServiceNowUpdateRecord[] = this._filterRecords(records);
    const selectedRecord: IServiceNowUpdateRecord | undefined =
      filteredRecords.find((record: IServiceNowUpdateRecord) => record.sysId === this._selectedSysId) ??
      records.find((record: IServiceNowUpdateRecord) => record.sysId === this._selectedSysId);
    const products: string[] = Array.from(new Set(records.map((record: IServiceNowUpdateRecord) => record.product))).sort();
    const statuses: string[] = Array.from(new Set(records.map((record: IServiceNowUpdateRecord) => record.status))).sort();
    const statusCounts: IStatusCount[] = this._getStatusCounts(filteredRecords);
    const highPriorityCount: number = filteredRecords.filter((record: IServiceNowUpdateRecord) =>
      record.priority === '1' || record.priority === '2'
    ).length;
    const isDarkTheme: boolean = this.hostContext.theme === 'dark';
    const isFullscreen: boolean = this.hostContext.displayMode === 'fullscreen';
    const rootClass: string = `${styles.serviceNowCopilotUpdates} ${isDarkTheme ? styles.dark : ''} ${isFullscreen ? styles.fullscreen : ''}`;
    const connectorName: string = this.properties.connectorName || 'ServiceNow Connector Sample';

    this.context.domElement.innerHTML = `
      <section class="${rootClass}">
        <header class="${styles.header}">
          <div>
            <span class="${styles.eyebrow}">Native Copilot UX component</span>
            <h1>${escape(this.properties.title || 'Copilot update change intelligence')}</h1>
            <p>Existing Copilot update data mapped to a ServiceNow-style change-management contract.</p>
          </div>
          <div class="${styles.headerActions}">
            <span class="${styles.connectorBadge}"><span></span>${escape(connectorName)}</span>
            ${isFullscreen ? '' : `<button id="sn-expand" class="${styles.iconButton}" type="button" title="Expand to fullscreen" aria-label="Expand to fullscreen">${EXPAND_ICON}</button>`}
          </div>
        </header>

        <div class="${styles.metrics}" aria-label="Change record metrics">
          ${this._renderMetric('Matching changes', String(filteredRecords.length), 'Current filtered work queue')}
          ${this._renderMetric('High priority', String(highPriorityCount), 'Priority 1 or 2')}
          ${this._renderMetric('Rolling out', String(statusCounts.find((item: IStatusCount) => item.label === 'Rolling out')?.count ?? 0), 'Requires rollout tracking')}
          ${this._renderMetric('Products', String(new Set(filteredRecords.map((record: IServiceNowUpdateRecord) => record.product)).size), 'Affected Microsoft products')}
        </div>

        <div class="${styles.workspace}">
          <aside class="${styles.sidebar}">
            <div class="${styles.panelHeading}">
              <div>
                <span class="${styles.sectionLabel}">Change portfolio</span>
                <h2>Filter updates</h2>
              </div>
              <button id="sn-clear" class="${styles.secondaryButton}" type="button">Clear</button>
            </div>

            <label class="${styles.field}">
              <span>Time window</span>
              <select id="sn-window">
                ${[7, 30, 90, 365].map((days: number) =>
                  `<option value="${days}" ${this._timeWindowDays === days ? 'selected' : ''}>Last ${days} days</option>`
                ).join('')}
              </select>
            </label>

            <label class="${styles.field}">
              <span>Product</span>
              <select id="sn-product">
                <option value="${ALL}">All products</option>
                ${products.map((product: string) =>
                  `<option value="${escape(product)}" ${this._productFilter === product ? 'selected' : ''}>${escape(product)}</option>`
                ).join('')}
              </select>
            </label>

            <label class="${styles.field}">
              <span>Rollout status</span>
              <select id="sn-status">
                <option value="${ALL}">All statuses</option>
                ${statuses.map((status: string) =>
                  `<option value="${escape(status)}" ${this._statusFilter === status ? 'selected' : ''}>${escape(status)}</option>`
                ).join('')}
              </select>
            </label>

            <label class="${styles.field}">
              <span>Search changes</span>
              <input id="sn-search" type="search" value="${escape(this._searchText)}" placeholder="Number, title, product, team" />
            </label>

            <div class="${styles.statusChart}">
              <span class="${styles.sectionLabel}">Status distribution</span>
              ${statusCounts.map((item: IStatusCount) => {
                const width: number = filteredRecords.length ? Math.max(6, Math.round(item.count / filteredRecords.length * 100)) : 0;
                return `<div class="${styles.statusRow}">
                  <div><span>${escape(item.label)}</span><strong>${item.count}</strong></div>
                  <div class="${styles.track}"><span style="width:${width}%"></span></div>
                </div>`;
              }).join('')}
            </div>
          </aside>

          <main class="${styles.content}">
            <div class="${styles.panelHeading}">
              <div>
                <span class="${styles.sectionLabel}">ServiceNow-style change queue</span>
                <h2>${filteredRecords.length} matching Copilot updates</h2>
              </div>
              <span class="${styles.dataNote}">Bundled test data · Replaceable by connector payload</span>
            </div>

            <div class="${styles.tableWrap}">
              <table>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Short description</th>
                    <th>Product</th>
                    <th>Priority</th>
                    <th>State</th>
                    <th>Rollout status</th>
                    <th>Modified</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRecords.length ? filteredRecords.map((record: IServiceNowUpdateRecord) =>
                    this._renderRecordRow(record)
                  ).join('') : `<tr><td colspan="7" class="${styles.empty}">No updates match the selected filters.</td></tr>`}
                </tbody>
              </table>
            </div>

            ${selectedRecord ? this._renderDetails(selectedRecord) : `
              <div class="${styles.selectionHint}">
                <strong>Select a change record</strong>
                <span>Review its source, rollout state, assignment, and full description.</span>
              </div>`}
          </main>
        </div>
      </section>`;

    this._bindEvents();
  }

  private _initializeState(): void {
    if (this._filtersInitialized) return;
    this._timeWindowDays = this.properties.timeWindowDays && this.properties.timeWindowDays > 0
      ? this.properties.timeWindowDays
      : DEFAULT_WINDOW_DAYS;
    this._productFilter = this.properties.product || ALL;
    this._statusFilter = this.properties.status || ALL;
    this._filtersInitialized = true;
  }

  private _getRecords(): IServiceNowUpdateRecord[] {
    return this.properties.records?.length
      ? this.properties.records.map((record: unknown) => serviceNowUpdateRecordSchema.parse(record))
      : SAMPLE_RECORDS;
  }

  private _filterRecords(records: IServiceNowUpdateRecord[]): IServiceNowUpdateRecord[] {
    const newestTimestamp: number = Math.max(...records.map((record: IServiceNowUpdateRecord) =>
      new Date(record.modifiedOn).getTime()
    ));
    const threshold: number = newestTimestamp - (this._timeWindowDays - 1) * 24 * 60 * 60 * 1000;
    const query: string = this._searchText.trim().toLowerCase();

    return records.filter((record: IServiceNowUpdateRecord) => {
      const searchable: string = [
        record.number,
        record.shortDescription,
        record.product,
        record.status,
        record.assignedTo
      ].join(' ').toLowerCase();

      return new Date(record.modifiedOn).getTime() >= threshold &&
        (this._productFilter === ALL || record.product === this._productFilter) &&
        (this._statusFilter === ALL || record.status === this._statusFilter) &&
        (!query || searchable.includes(query));
    });
  }

  private _getStatusCounts(records: IServiceNowUpdateRecord[]): IStatusCount[] {
    const statusOrder: IServiceNowUpdateRecord['status'][] = [
      'In development',
      'Rolling out',
      'Generally available',
      'Unknown'
    ];
    return statusOrder
      .map((label: IServiceNowUpdateRecord['status']) => ({
        label,
        count: records.filter((record: IServiceNowUpdateRecord) => record.status === label).length
      }))
      .filter((item: IStatusCount) => item.count > 0);
  }

  private _renderMetric(label: string, value: string, hint: string): string {
    return `<article class="${styles.metric}">
      <span>${escape(label)}</span>
      <strong>${escape(value)}</strong>
      <small>${escape(hint)}</small>
    </article>`;
  }

  private _renderRecordRow(record: IServiceNowUpdateRecord): string {
    const selectedClass: string = record.sysId === this._selectedSysId ? styles.selected : '';
    return `<tr class="${selectedClass}" data-sys-id="${escape(record.sysId)}" tabindex="0">
      <td><span class="${styles.number}">${escape(record.number)}</span></td>
      <td><strong>${escape(record.shortDescription)}</strong><small>${escape(record.assignedTo)}</small></td>
      <td>${escape(record.product)}</td>
      <td><span class="${styles.priority} ${styles[`priority${record.priority}`]}">P${escape(record.priority)}</span></td>
      <td>${escape(record.state)}</td>
      <td><span class="${styles.status}">${escape(record.status)}</span></td>
      <td>${escape(record.modifiedOn)}</td>
    </tr>`;
  }

  private _renderDetails(record: IServiceNowUpdateRecord): string {
    const safeUrl: string | undefined = this._getSafeUrl(record.sourceUrl);
    const isSending: boolean = this._followUpState === 'sending';
    const followUpStatus: string = this._getFollowUpStatus(record.number);
    return `<section class="${styles.details}" aria-label="Selected change details">
      <div class="${styles.detailsHeader}">
        <div>
          <span class="${styles.sectionLabel}">${escape(record.number)} · ${escape(record.sysId)}</span>
          <h2>${escape(record.shortDescription)}</h2>
        </div>
        <div class="${styles.detailsActions}">
          ${safeUrl ? `<a class="${styles.secondaryButton}" href="${escape(safeUrl)}" target="_blank" rel="noopener noreferrer">Open Microsoft source</a>` : ''}
          <button id="sn-submit-copilot" class="${styles.primaryButton}" type="button" ${isSending ? 'disabled' : ''}>
            ${isSending ? 'Sending…' : 'Submit ticket to Copilot'}
          </button>
        </div>
      </div>
      <div class="${styles.detailGrid}">
        ${this._renderDetailField('Product', record.product)}
        ${this._renderDetailField('Rollout status', record.status)}
        ${this._renderDetailField('ServiceNow state', record.state)}
        ${this._renderDetailField('Priority', `P${record.priority}`)}
        ${this._renderDetailField('Assigned to', record.assignedTo)}
        ${this._renderDetailField('Roadmap ID', record.roadmapId || 'Not provided')}
        ${this._renderDetailField('Source', record.source)}
        ${this._renderDetailField('Modified', record.modifiedOn)}
      </div>
      <p class="${styles.description}">${escape(record.description)}</p>
      ${followUpStatus ? `<p id="sn-follow-up-status" class="${styles.followUpStatus} ${this._followUpState === 'error' ? styles.followUpError : ''}" role="status" aria-live="polite">${escape(followUpStatus)}</p>` : ''}
    </section>`;
  }

  private _renderDetailField(label: string, value: string): string {
    return `<div><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;
  }

  private _getSafeUrl(value: string | undefined): string | undefined {
    if (!value) return undefined;
    try {
      const url: URL = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
    } catch {
      return undefined;
    }
  }

  private _getFollowUpStatus(ticketNumber: string): string {
    switch (this._followUpState) {
      case 'sending':
        return `Sending ${ticketNumber} to Copilot…`;
      case 'sent':
        return `${ticketNumber} was submitted. Copilot is preparing a response in the conversation.`;
      case 'error':
        return `Copilot could not accept ${ticketNumber}. Try submitting the ticket again.`;
      default:
        return '';
    }
  }

  private _resetFollowUpState(): void {
    this._followUpState = 'idle';
  }

  private _buildTicketContext(record: IServiceNowUpdateRecord): string {
    return [
      `Selected ServiceNow-style change ticket: ${record.number}`,
      `System ID: ${record.sysId}`,
      `Short description: ${record.shortDescription}`,
      `Description: ${record.description}`,
      `Product: ${record.product}`,
      `Rollout status: ${record.status}`,
      `Priority: P${record.priority}`,
      `State: ${record.state}`,
      `Assigned to: ${record.assignedTo}`,
      `Source: ${record.source}`,
      `Modified: ${record.modifiedOn}`,
      `Roadmap ID: ${record.roadmapId || 'Not provided'}`,
      `Source URL: ${record.sourceUrl || 'Not provided'}`
    ].join('\n');
  }

  private async _submitTicketToCopilot(record: IServiceNowUpdateRecord): Promise<void> {
    this._followUpState = 'sending';
    this.render();

    const ticketContext: string = this._buildTicketContext(record);

    try {
      await this.context.copilotBridge.updateModelContextAsync({
        content: [createCopilotTextContent(ticketContext)],
        structuredContent: {
          selectedTicket: record
        }
      });

      const result = await this.context.copilotBridge.sendFollowUpMessageAsync([
        createCopilotTextContent(
          `Tell me more about ticket ${record.number}. Explain its purpose, current rollout status, priority, ownership, potential impact, and recommended next steps using the selected ticket context. Do not invent missing details.`
        )
      ]);

      this._followUpState = result.isError ? 'error' : 'sent';
    } catch {
      this._followUpState = 'error';
    }

    this.render();
  }

  private _bindEvents(): void {
    const expandButton: HTMLButtonElement | null = this.context.domElement.querySelector('#sn-expand');
    expandButton?.addEventListener('click', () => {
      this.requestDisplayModeAsync('fullscreen').catch(() => undefined);
    });

    const windowSelect: HTMLSelectElement | null = this.context.domElement.querySelector('#sn-window');
    windowSelect?.addEventListener('change', () => {
      this._timeWindowDays = Number(windowSelect.value);
      this._selectedSysId = undefined;
      this._resetFollowUpState();
      this.render();
    });

    const productSelect: HTMLSelectElement | null = this.context.domElement.querySelector('#sn-product');
    productSelect?.addEventListener('change', () => {
      this._productFilter = productSelect.value;
      this._selectedSysId = undefined;
      this._resetFollowUpState();
      this.render();
    });

    const statusSelect: HTMLSelectElement | null = this.context.domElement.querySelector('#sn-status');
    statusSelect?.addEventListener('change', () => {
      this._statusFilter = statusSelect.value;
      this._selectedSysId = undefined;
      this._resetFollowUpState();
      this.render();
    });

    const searchInput: HTMLInputElement | null = this.context.domElement.querySelector('#sn-search');
    searchInput?.addEventListener('input', () => {
      this._searchText = searchInput.value;
      this._selectedSysId = undefined;
      this._resetFollowUpState();
      this.render();
    });

    const clearButton: HTMLButtonElement | null = this.context.domElement.querySelector('#sn-clear');
    clearButton?.addEventListener('click', () => {
      this._productFilter = ALL;
      this._statusFilter = ALL;
      this._searchText = '';
      this._timeWindowDays = DEFAULT_WINDOW_DAYS;
      this._selectedSysId = undefined;
      this._resetFollowUpState();
      this.render();
    });

    this.context.domElement.querySelectorAll<HTMLTableRowElement>('tr[data-sys-id]').forEach((row: HTMLTableRowElement) => {
      const selectRow = (): void => {
        this._selectedSysId = row.dataset.sysId;
        this._resetFollowUpState();
        this.render();
      };
      row.addEventListener('click', selectRow);
      row.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectRow();
        }
      });
    });

    const submitButton: HTMLButtonElement | null = this.context.domElement.querySelector('#sn-submit-copilot');
    const selectedRecord: IServiceNowUpdateRecord | undefined = this._getRecords()
      .find((record: IServiceNowUpdateRecord) => record.sysId === this._selectedSysId);
    if (submitButton && selectedRecord) {
      submitButton.addEventListener('click', () => {
        this._submitTicketToCopilot(selectedRecord).catch(() => {
          this._followUpState = 'error';
          this.render();
        });
      });
    }
  }
}
